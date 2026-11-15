import { NextRequest } from "next/server";

import { SITE_CONTACT_EMAIL } from "@/lib/site";
import { contactInputSchema } from "@/schemas/contactSchema";
import { createResponse } from "@/utils/apiHelper";
import { sendEmail } from "@/utils/email/resend";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = contactInputSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Check the form and try again.";
      return createResponse({ error: message }, 400);
    }

    const { name, email, country_code, mobile, message, website } = parsed.data;

    if (website) {
      return createResponse({
        success: true,
        message: "Thanks. We'll write back soon.",
      });
    }

    const phone = mobile ? `${country_code} ${mobile}`.trim() : "Not given";
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");

    await sendEmail({
      to: SITE_CONTACT_EMAIL,
      replyTo: email,
      subject: `Contact from ${name}`,
      text: [`From: ${name}`, `Email: ${email}`, `Phone: ${phone}`, "", message].join("\n"),
      html: `<p><strong>From:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Phone:</strong> ${safePhone}</p><p>${safeMessage}</p>`,
    });

    return createResponse({
      success: true,
      message: "Thanks. We'll write back soon.",
    });
  } catch (error) {
    console.error("Contact form email failed:", error);
    return createResponse(
      { error: "We couldn't send that just now. Please try again." },
      500,
    );
  }
}
