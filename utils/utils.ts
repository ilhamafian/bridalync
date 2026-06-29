import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const isString = (value: unknown): value is string =>
  typeof value === "string";

export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const formatDate = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string => {
  return new Date(date).toLocaleDateString("en-MY", options);
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
