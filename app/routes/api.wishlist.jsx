import { json } from "@remix-run/node";
import { db } from "../db.server";
import { cors } from "remix-utils/cors";

const corsOptions = {
  origin: "https://dev-by-chaman.myshopify.com",
  credentials: true,
};
// Add this inside loader()
export async function loader({ request }) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  const productId = url.searchParams.get("productId");
  const shop = url.searchParams.get("shop");

  if (!customerId || !productId || !shop) {
    return cors(
      request,
      json({ message: "Missing required params" }, { status: 400 }),
      corsOptions,
    );
  }

  const wishlist = await db.wishlist.findMany({
    where: { customerId, shop, productId },
  });

  return cors(
    request,
    json({
      message: "Wishlist fetched",
      data: wishlist,
      wishlist: wishlist.length > 0,
    }),
    corsOptions,
  );
}

export async function action({ request }) {
  const formData = await request.formData();
  const customerId = formData.get("customerId");
  const productId = formData.get("productId");
  const shop = formData.get("shop");
  const _action = formData.get("_action");

  if (!customerId || !productId || !shop) {
    return cors(
      request,
      json({ message: "Missing required params" }, { status: 400 }),
      corsOptions
    );
  }

  switch (_action) {
    case "GET": {
      const wishlist = await db.wishlist.findMany({
        where: { customerId, shop, productId },
      });

      return cors(
        request,
        json({
          message: "Wishlist fetched successfully",
          data: wishlist,
          wishlist: wishlist.length > 0,
        }),
        corsOptions
      );
    }

    case "CREATE": {
      await db.wishlist.create({ data: { customerId, productId, shop } });
      return cors(
        request,
        json({ message: "Product added to wishlist", wishlist: true }),
        corsOptions
      );
    }

    case "DELETE": {
      await db.wishlist.deleteMany({
        where: { customerId, shop, productId },
      });
      return cors(
        request,
        json({ message: "Product removed from wishlist", wishlist: false }),
        corsOptions
      );
    }

    case "PATCH": {
      return cors(
        request,
        json({ message: "Patch method placeholder" }),
        corsOptions
      );
    }

    default:
      return new Response("Method not allowed", {
        status: 405,
        headers: { "Access-Control-Allow-Origin": corsOptions.origin },
      });
  }
}

