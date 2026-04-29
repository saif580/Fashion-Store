# TODO

## Immediate

- [x] Finalize `dev` email settings to use Mailpit
- [x] Verify Mailpit email delivery for verification and reset-password flows
- [ ] Decide whether `uat` will use sandbox SMTP or real SMTP
- [x] Verify all auth endpoints end-to-end after env changes
- [ ] Add `.env` documentation for required variables

## Auth

- [x] Add refresh token flow verification
- [x] Add logout token invalidation verification
- [x] Add email verification flow end-to-end
- [x] Add forgot-password and reset-password end-to-end flow
- [x] Add resend verification email flow
- [x] Fix one-active-verification-token persistence rule
- [ ] Decide final password policy for production
- [ ] Add role-based authorization middleware
- [ ] Decide whether refresh tokens should be hashed in the database
- [ ] Add auth audit logging for sensitive events

## Users

- [ ] Add customer profile update API
- [ ] Add address module for shipping and billing addresses
- [ ] Add default address selection

## Catalog

- [ ] Create categories module
- [ ] Create products module
- [ ] Add product variants
- [ ] Add product images support
- [ ] Add product attributes like size and color
- [ ] Add product search and filters

## Cart And Orders

- [ ] Create cart module
- [ ] Create cart items module
- [ ] Create orders module
- [ ] Create order items module
- [ ] Add order status flow

## Inventory And Pricing

- [ ] Add inventory tracking
- [ ] Add stock reservation strategy
- [ ] Add coupon and discount support

## Payments

- [ ] Choose payment provider
- [ ] Add payment initiation API
- [ ] Add payment callback/webhook handling
- [ ] Add payment status persistence

## Admin

- [ ] Add admin-only product management APIs
- [ ] Add admin-only order management APIs
- [ ] Add admin-only user management APIs

## Documentation

- [ ] Keep Swagger docs updated for every new API
- [ ] Re-export `docs/openapi.json` after API changes
- [ ] Add a project `README.md`
