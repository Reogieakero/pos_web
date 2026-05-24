"use server";

import QRCode from 'qrcode';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.DATABASE_URL!,
    process.env.DATABASE_KEY!
  );
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createProductAction(formData: FormData) {
  const food_name         = formData.get("food_name") as string;
  const price_per_serving = parseFloat(formData.get("price_per_serving") as string || "0");
  const other_details     = formData.get("other_details") as string;
  const base64_image      = formData.get("food_image") as string;
  const product_type      = (formData.get("product_type") as string) || "food";

  // Stock-only fields
  const stock_quantity      = product_type === "stock"
    ? parseFloat(formData.get("stock_quantity") as string || "0") || null
    : null;
  const stock_unit          = product_type === "stock"
    ? (formData.get("stock_unit") as string) || null
    : null;
  const low_stock_threshold = product_type === "stock"
    ? parseFloat(formData.get("low_stock_threshold") as string || "0") || null
    : null;
  const selling_price       = product_type === "stock"
    ? parseFloat(formData.get("selling_price") as string || "0") || null
    : null;

  if (!food_name || price_per_serving <= 0) return { success: false, error: "Invalid data" };

  const supabase = getSupabase();

  try {
    let finalImageUrl: string | null = null;

    if (base64_image?.includes(";base64,")) {
      const [meta, base64Data] = base64_image.split(";base64,");
      const mimeType = meta.split(":")[1];
      const filename = `${Date.now()}.${mimeType.split("/")[1] || "jpg"}`;

      const { error: uploadError } = await supabase.storage
        .from("food-images")
        .upload(filename, Buffer.from(base64Data, "base64"), { contentType: mimeType });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("food-images")
          .getPublicUrl(filename);
        finalImageUrl = urlData.publicUrl;
      }
    }

    const qr = await QRCode.toDataURL(
      JSON.stringify({ name: food_name, price: price_per_serving, type: product_type })
    );

    const { error: insertError } = await supabase.from("products").insert({
      name: food_name,
      price: price_per_serving,         // cost_per_unit for stock items
      category: other_details || null,
      image_url: finalImageUrl,
      qr_code_url: qr,
      product_type,
      stock_quantity,
      stock_unit,
      low_stock_threshold,
      selling_price,                     // only meaningful for stock items
    });

    if (insertError) throw new Error(insertError.message);

    revalidatePath('/dashboard');
    return { success: true, qrCode: qr };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── READ ─────────────────────────────────────────────────────────────────────

export async function getProductsAction() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: Array.isArray(data) ? data : [] };
}

export async function getFoodProductsAction() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("product_type", "food")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: Array.isArray(data) ? data : [] };
}

export async function getStockProductsAction() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("product_type", "stock")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: Array.isArray(data) ? data : [] };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateProductAction(
  id: number,
  name: string,
  price: number,
  base64_image?: string | null,
  stockFields?: {
    stock_quantity?:      number | null;
    stock_unit?:          string | null;
    low_stock_threshold?: number | null;
    selling_price?:       number | null;
  }
) {
  const supabase = getSupabase();

  try {
    const updateData: any = { name, price };

    if (base64_image?.includes(";base64,")) {
      const [meta, base64Data] = base64_image.split(";base64,");
      const mimeType = meta.split(":")[1];
      const filename = `${Date.now()}.${mimeType.split("/")[1] || "jpg"}`;

      const { error: uploadError } = await supabase.storage
        .from("food-images")
        .upload(filename, Buffer.from(base64Data, "base64"), { contentType: mimeType });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("food-images")
          .getPublicUrl(filename);
        updateData.image_url = urlData.publicUrl;
      }
    }

    if (stockFields) {
      if (stockFields.stock_quantity      !== undefined) updateData.stock_quantity      = stockFields.stock_quantity;
      if (stockFields.stock_unit          !== undefined) updateData.stock_unit          = stockFields.stock_unit;
      if (stockFields.low_stock_threshold !== undefined) updateData.low_stock_threshold = stockFields.low_stock_threshold;
      if (stockFields.selling_price       !== undefined) updateData.selling_price       = stockFields.selling_price;
    }

    const qr = await QRCode.toDataURL(JSON.stringify({ name, price }));
    updateData.qr_code_url = qr;

    const { error: updateError } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id);

    if (updateError) throw new Error(updateError.message);

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── ADJUST STOCK QUANTITY (manual +/-) ───────────────────────────────────────

export async function adjustStockQuantityAction(id: number, delta: number) {
  const supabase = getSupabase();
  try {
    const { data, error: fetchError } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const newQty = Math.max(0, (data?.stock_quantity ?? 0) + delta);

    const { error: updateError } = await supabase
      .from("products")
      .update({ stock_quantity: newQty })
      .eq("id", id);

    if (updateError) throw new Error(updateError.message);

    revalidatePath('/dashboard');
    return { success: true, newQuantity: newQty };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── DELETE / ARCHIVE ─────────────────────────────────────────────────────────

export async function deleteProductAction(id: number) {
  const supabase = getSupabase();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard');
  return { success: true };
}