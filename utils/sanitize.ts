import xss from "xss";

export const sanitizeObject = (
  input: Record<string, any>
): Record<string, any> => {
  const output: Record<string, any> = {};
  for (const key in input) {
    if (typeof input[key] === "string") {
      output[key] = sanitizeString(input[key]);
    } else if (typeof input[key] === "object" && input[key] !== null && !Array.isArray(input[key])) {
      output[key] = sanitizeObject(input[key]);
    } else {
      output[key] = input[key];
    }
  }
  return output;
};

export const sanitizeString = (str: string): string => {
  return xss(str.trim());
};
