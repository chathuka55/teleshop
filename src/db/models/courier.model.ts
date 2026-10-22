import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions } from "./_shared";

function isRegex(source: string): boolean {
  if (source.length > 200) return false;
  try {
    // eslint-disable-next-line security/detect-non-literal-regexp -- admin-supplied, validated here
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
}

const courierSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    /** regex source every tracking code for this courier must match */
    codePattern: { type: String, required: true, validate: { validator: isRegex, message: "Invalid regex" } },
    /** `https://…{code}…` — `{code}` is replaced with the URL-encoded tracking code */
    trackingUrlTemplate: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => v.startsWith("https://") && v.includes("{code}"),
        message: "Must be an https URL containing {code}",
      },
    },
    isActive: { type: Boolean, default: true },
  },
  baseOptions,
);

export type CourierDoc = InferSchemaType<typeof courierSchema>;
export const CourierModel =
  (models.Courier as Model<CourierDoc> | undefined) ??
  model<CourierDoc>("Courier", courierSchema, "couriers");
