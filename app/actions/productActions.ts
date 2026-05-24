"use server";

import QRCode from 'qrcode';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// Server-side client uses non-public env vars
function getSupabase() {
  return createClient(
    process.env.DATABASE_URL!,
    process.env.DATABASE_KEY!
  );
}

export async function createProductAction(formData: FormData) {
  const food_name = formData.get("food_name") as string;
  const price_per_serving = parseFloat(formData.get("price_per_serving") as string || "0");
  const other_details = formData.get("other_details") as string;
  const base64_image = formData.get("food_image") as string;

  if (!food_name || price_per_serving <= 0) return { success: false, error: "Invalid data" };

  const supabase = getSupabase();

  try {
    let finalImageUrl = null;

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

    const qr = await QRCode.toDataURL(JSON.stringify({ name: food_name, price: price_per_serving }));

    const { error: insertError } = await supabase
      .from("products")
      .insert({
        name: food_name,
        price: price_per_serving,
        category: other_details,
        image_url: finalImageUrl,
        qr_code_url: qr,
      });

    if (insertError) throw new Error(insertError.message);

    revalidatePath('/dashboard');
    return { success: true, qrCode: qr };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProductsAction() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: Array.isArray(data) ? data : [] };
}

export async function updateProductAction(
  id: number,
  name: string,
  price: number,
  base64_image?: string | null
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