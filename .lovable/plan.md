# Business Details Feature - COMPLETED

## Summary

Fixed the discrepancy where business details (trading hours, phone, website) showed "Not specified" on the main page but appeared correctly in the registration preview.

## What Was Done

1. **Database Migration**: Updated `get_public_business_info` PostgreSQL function to return `hours` and `contact_info` columns
2. **useBusinessData.tsx**: Added `hours` and `contact_info` to interface, created `formatHours` transformer, mapped data to Place type
3. **useAdvancedSearch.ts**: Added same interface updates and transformer for consistency

## Result

Business hours, phone numbers, and website URLs now display correctly in the Details popover on the main page, matching the data shown in the registration preview.
