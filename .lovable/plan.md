

## Plan: Add Pricing Link to the Sidebar

Add a Pricing navigation item to `src/components/layout/sidebar/sidebarConfig.ts` so users can easily find subscription plans.

### Changes

**`src/components/layout/sidebar/sidebarConfig.ts`**
- Import `CreditCard` icon from lucide-react
- Add `{ to: '/pricing', icon: CreditCard, label: 'Pricing' }` to the `navItems` array (after "About Us", before admin-only items)

One file, one small addition.

