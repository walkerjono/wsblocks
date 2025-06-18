# TODO's

- [ ] Seed global admin user
- [ ] AAD SSO - https://www.better-auth.com/docs/authentication/microsoft
- [x] Remove locales
- [ ] Roles (Admin, Manager, User)
- [ ] OpenAPI / Swagger
- [ ] refactor custom security:
  - csrf with https://nuxt.com/modules/security
  - feature/project branch

- [x] feature flags
  - [ ] refactor NUXT_REDIS_ENABLED, NUXT_STRIPE_ENABLED
  - [ ] Add flag for localisation
  - [ ] InputTags

- [ ] shared types/company.ts for each page. refer to Company
 
// app/types/company.ts
export interface Company {
  id: string
  name: string
  type: string
  tags?: string
  isActive: boolean
  externalReference?: string
  createdAt: string
}

- [ ] refactor Base modal
  - for Company and Project.
  - Allow base to be used for Edit

ERD

- [-] Company
  - tags on list and create/edit (inputTags)
  - default columns
  - default sort
  - delete

- [-] Project
  - listview
  - create modal
  - edit page
    - General
    - Scope
    - Audit
  - default columns
  - default sort
  - delete
  - check timezone conversion of start/end
