
# Fix Business Details Discrepancy Between Main Page and Registered-Business Page

## Problem Summary

The "Details" popover on the **main page** (map view) shows "Not specified" for all trading hours and "No phone number", while the **update-registration preview** shows the correct data (09:00 - 17:00, Closed, phone number, website, etc.).

**Root Cause:** The `get_public_business_info` PostgreSQL function does NOT return the `hours`, `contact_info`, or other sensitive columns from the database. This is by design for security reasons (hiding contact details from public view), but it means the `DetailsCard` component has no data to display.

### Data Flow Comparison

| Page | Data Source | Hours Data | Phone Data |
|------|-------------|------------|------------|
| Main page (map) | `get_public_business_info` RPC | ❌ Not returned | ❌ Not returned |
| Update-registration preview | Form values directly | ✅ From form state | ✅ From form state |
| Registered-business page | Direct query with RLS | ✅ Available in `Business` type | ✅ Available in `contact_info` |

---

## Solution Options

### Option A: Expose Hours & Contact in Public Function (Recommended)

Update `get_public_business_info` to include `hours` and `contact_info` columns. These are reasonable to share publicly as they help customers know when to visit and how to contact the business.

**Pros:**
- Business hours and phone numbers are typically public information
- Provides consistent experience across all views
- Simple implementation

**Cons:**
- Exposes contact info (phone/email) to all users
- May need to consider privacy preferences

### Option B: Create Separate Function for Detailed View

Keep `get_public_business_info` minimal and create a new function `get_business_details` that returns hours and contact info for specific business IDs when a user clicks "Details".

**Pros:**
- Only fetches detailed data when needed
- Can add rate limiting or access controls

**Cons:**
- More complex implementation
- Additional API call needed

---

## Recommended Implementation (Option A)

### Step 1: Update the Database Function

Modify `get_public_business_info` to include `hours` and `contact_info` columns:

```sql
CREATE OR REPLACE FUNCTION public.get_public_business_info(user_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  description TEXT,
  category TEXT,
  business_types TEXT[],
  keywords TEXT[],
  images TEXT[],
  location TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  coordinates TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_verified BOOLEAN,
  is_certified BOOLEAN,
  verification_status TEXT,
  is_user_business BOOLEAN,
  created_at TIMESTAMP,
  hours JSONB,           -- NEW
  contact_info JSONB     -- NEW
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.business_name AS name,
    b.business_description AS description,
    b.category,
    b.business_types,
    b.keywords,
    b.images,
    b.location,
    b.street_address,
    b.city,
    b.state,
    b.zip_code AS postal_code,
    b.country,
    b.coordinates,
    b.lat AS latitude,
    b.lng AS longitude,
    b.is_verified,
    b.is_certified,
    b.verification_status,
    CASE WHEN user_uuid IS NOT NULL AND b.owner_id = user_uuid THEN true ELSE false END AS is_user_business,
    b.created_at,
    b.hours,           -- NEW
    b.contact_info     -- NEW
  FROM businesses b
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 2: Update TypeScript Interface

Add `hours` and `contact_info` to the `PublicBusinessInfo` interface in `useBusinessData.tsx`:

```typescript
interface PublicBusinessInfo {
  // ... existing fields
  hours?: {
    [day: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
  contact_info?: {
    phone?: string;
    email?: string;
    website?: string;
    first_name?: string;
    last_name?: string;
  };
}
```

### Step 3: Transform Hours Data

Update the data transformation in `useBusinessData.tsx` to properly format hours for the `Place` type:

```typescript
// Transform hours from database format to Place format
const formatHours = (dbHours: any): { [key: string]: string } | undefined => {
  if (!dbHours) return undefined;
  
  const formatted: { [key: string]: string } = {};
  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of daysOrder) {
    const dayData = dbHours[day];
    if (dayData) {
      if (dayData.closed) {
        formatted[day] = 'Closed';
      } else if (dayData.open && dayData.close) {
        formatted[day] = `${dayData.open} - ${dayData.close}`;
      }
    }
  }
  
  return Object.keys(formatted).length > 0 ? formatted : undefined;
};

// In the transformation:
return {
  // ... existing fields
  website: business.contact_info?.website || "",
  phone: business.contact_info?.phone || "",
  hours: formatHours(business.hours),
};
```

### Step 4: Update DetailsCard Hours Handling

The `DetailsCard` component already handles hours correctly, but ensure it falls back gracefully:

```typescript
const getFormattedHours = () => {
  if (!place.hours || Object.keys(place.hours).length === 0) return null;
  
  return DAYS_ORDER.map(day => {
    const hours = place.hours?.[day];
    return {
      day: formatDayName(day),
      hours: hours || 'Not specified'
    };
  });
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Update `get_public_business_info` function to return `hours` and `contact_info` |
| `src/hooks/useBusinessData.tsx` | Update interface, add hours transformer, include phone/website/hours in transformation |
| `src/hooks/useAdvancedSearch.ts` | Update interface and transformation to include hours/contact data if search functions also need them |

---

## Testing Plan

After implementation:

1. **Main page test**: Click "Details" on a business card on the map and verify:
   - Trading hours show actual times (e.g., "Monday: 09:00 - 17:00")
   - Phone number displays correctly
   - Website link is visible

2. **Registered-business page test**: Edit a business, go to Preview tab, click "Details" and verify data matches

3. **Consistency check**: Compare Details popup between main page and update-registration preview for the same business

---

## Security Consideration

Business hours and contact information are typically considered public data that businesses want customers to see. However, if there are privacy concerns:

- Could add a `hide_contact_info` boolean field that business owners can set
- Could restrict `contact_info.email` from being exposed while showing phone and website
