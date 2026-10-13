import { toWhatsAppNumber } from "@/utils/booking/messages";

export type WhatsAppUrlButton = {
  index: number;
  /** Dynamic suffix appended to the template's website URL. */
  text: string;
};

type SendTemplateInput = {
  countryCode?: string | null;
  mobile?: string | null;
  template: string;
  /** Must match the language the template was approved in; defaults to `WHATSAPP_TEMPLATE_LANGUAGE` / `en`. */
  language?: string;
  body: string[];
  urlButton?: WhatsAppUrlButton;
};

function graphVersion() {
  return process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v22.0";
}

function templateLanguage() {
  return process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en";
}

/** WhatsApp rejects empty values, newlines, tabs, and 5+ spaces in a row. */
export function sanitizeTemplateParam(value: string) {
  const cleaned = value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {5,}/g, "    ")
    .trim();
  return cleaned || "-";
}

/**
 * Sends an approved Cloud API template. Skips (and logs) when the token,
 * phone number id, or client number is missing.
 */
export async function sendWhatsAppTemplate(input: SendTemplateInput) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) {
    console.warn(
      `[whatsapp] Skipping ${input.template} — WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set`
    );
    return;
  }

  const countryCode = input.countryCode?.trim() ?? "";
  const mobile = input.mobile?.trim() ?? "";
  if (!countryCode || !mobile) {
    console.warn(`[whatsapp] Skipping ${input.template} — client has no phone`);
    return;
  }

  const to = toWhatsAppNumber(countryCode, mobile);
  if (!to) {
    console.warn(`[whatsapp] Skipping ${input.template} — client has no phone`);
    return;
  }

  const components: Array<Record<string, unknown>> = [
    {
      type: "body",
      parameters: input.body.map((text) => ({
        type: "text",
        text: sanitizeTemplateParam(text),
      })),
    },
  ];

  if (input.urlButton) {
    components.push({
      type: "button",
      sub_type: "url",
      index: String(input.urlButton.index),
      parameters: [
        {
          type: "text",
          text: sanitizeTemplateParam(input.urlButton.text),
        },
      ],
    });
  }

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion()}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: input.template,
          language: { code: input.language ?? templateLanguage() },
          components,
        },
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `[whatsapp] ${input.template} failed (${response.status}): ${detail}`
    );
  }
}
