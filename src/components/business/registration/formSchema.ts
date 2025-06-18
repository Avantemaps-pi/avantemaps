
import * as z from "zod";

export const businessTypes = [
  "Restaurant/Cafe",
  "Retail Store",
  "Service Provider",
  "Entertainment Venue",
  "Health & Wellness",
  "Education",
  "Professional Services",
  "Accommodation",
  "Transportation",
  "Technology",
  "Arts & Crafts",
  "Construction",
  "Agriculture",
  "Manufacturing",
  "Wholesale",
  "Other"
];

export const daysOfWeek = [
  { name: "Monday", open: "mondayOpen", close: "mondayClose", closed: "mondayClosed" },
  { name: "Tuesday", open: "tuesdayOpen", close: "tuesdayClose", closed: "tuesdayClosed" },
  { name: "Wednesday", open: "wednesdayOpen", close: "wednesdayClose", closed: "wednesdayClosed" },
  { name: "Thursday", open: "thursdayOpen", close: "thursdayClose", closed: "thursdayClosed" },
  { name: "Friday", open: "fridayOpen", close: "fridayClose", closed: "fridayClosed" },
  { name: "Saturday", open: "saturdayOpen", close: "saturdayClose", closed: "saturdayClosed" },
  { name: "Sunday", open: "sundayOpen", close: "sundayClose", closed: "sundayClosed" }
];

export const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  businessName: z.string().min(1, { message: "Business name is required" }),
  countryCode: z.string().default('+1'),
  phone: z.string().min(1, { message: "Phone number is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  website: z.string().optional(),
  streetAddress: z.string().min(1, { message: "Street address is required" }),
  apartment: z.string().optional(),
  city: z.string().min(1, { message: "City is required" }),
  state: z.string().min(1, { message: "State is required" }),
  zipCode: z.string().min(1, { message: "ZIP code is required" }),
  country: z.string().min(1, { message: "Country is required" }),
  businessTypes: z.array(z.string()).min(1, { message: "Choose at least one business type" }),
  businessDescription: z.string().min(10, { message: "Description must be at least 10 characters" }),
  piWalletAddress: z.string().min(1, { message: "Pi wallet address is required" }),
  mondayOpen: z.string(),
  mondayClose: z.string(),
  mondayClosed: z.boolean(),
  tuesdayOpen: z.string(),
  tuesdayClose: z.string(),
  tuesdayClosed: z.boolean(),
  wednesdayOpen: z.string(),
  wednesdayClose: z.string(),
  wednesdayClosed: z.boolean(),
  thursdayOpen: z.string(),
  thursdayClose: z.string(),
  thursdayClosed: z.boolean(),
  fridayOpen: z.string(),
  fridayClose: z.string(),
  fridayClosed: z.boolean(),
  saturdayOpen: z.string(),
  saturdayClose: z.string(),
  saturdayClosed: z.boolean(),
  sundayOpen: z.string(),
  sundayClose: z.string(),
  sundayClosed: z.boolean(),
});

export type FormValues = z.infer<typeof formSchema>;
