import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

function json(status: number, data: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  return json(200, {
    ok: true,
    message: "App proxy route is alive",
    path: new URL(request.url).pathname,
  });
}

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("POST /app/settings: start");

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  if (!payload || typeof payload !== "object") {
    return json(400, { error: "Empty or invalid payload" });
  }

  let admin;
  try {
    const { admin: proxyAdmin } = await authenticate.public.appProxy(request);
    admin = proxyAdmin;
  } catch {
    console.warn("public.appProxy auth failed; attempting admin auth");
    try {
      const { admin: fallbackAdmin } = await authenticate.admin(request);
      admin = fallbackAdmin;
    } catch {
      console.error("Admin auth failed.");
      return json(401, { error: "Authentication failed" });
    }
  }
  if (!admin) {
    return json(401, { error: "Admin unavailable after auth attempts" });
  }

  const {
    carat: caratRaw,
    caratWeight: caratWeightRaw,
    color,
    clarity,
    shape,
    lab,
    type,
    certificate_Number: certUnderscore,
    certificateNumber: certCamel,
    price,
    images = [],
  } = payload as Record<string, any>;

  const carat = caratRaw ?? caratWeightRaw;
  const certificateNumber = certUnderscore ?? certCamel;

  if (!carat || !color || !clarity || !shape || !lab || !type) {
    return json(400, {
      error: "Missing required fields: carat, color, clarity, shape, lab, type",
      received: payload,
    });
  }

  const title = `${carat}ct ${color} ${clarity} ${shape} ${lab} ${type}`;
  const descriptionHtml = certificateNumber
    ? `<p>Certificate Number: ${certificateNumber}</p>`
    : "Diamond product";

  const productInput = {
    title,
    descriptionHtml,
    tags: ["_diamond_selector_product"],
    status: "ACTIVE",
  };

  console.log("productInput:", productInput);

  let gqlResponse;
  try {
    gqlResponse = await admin.graphql(
      `
        mutation diamondProductCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              title
              descriptionHtml
              status
              tags
              }
            userErrors {
              field
              message
            }
          }
        }
      `,
      { variables: { input: productInput } },
    );
  } catch (error) {
    console.log("1111:", error);
    console.error("GraphQL request failed.");
    return json(500, { error: "GraphQL request failed" });
  }

  const responseJson = await gqlResponse.json();
  const productCreate = responseJson?.data?.productCreate;
  const userErrors = productCreate?.userErrors ?? [];

  if (userErrors.length > 0) {
    console.error("Shopify userErrors:", userErrors);
    return json(400, {
      error: "Failed to create diamond product",
      details: userErrors,
    });
  }

  const product = productCreate?.product;
  const node = product?.variants?.nodes?.[0];
  const variantId = 123456789;

  console.log("POST /app/settings success. Variant:", variantId);

  return json(200, {
    message: "Product created successfully",
    product,
    variant: {
      gid: node?.id,
      variantId,
      price,
    },
  });
};
