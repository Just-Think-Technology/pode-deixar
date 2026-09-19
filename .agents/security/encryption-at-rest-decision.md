# Encryption at Rest — Decision Record

- **Decision:** no application-level encryption at rest.
- **Rationale:** no PAN/CVV is stored (see [PCI](pci-card-data.md)),
  passwords use bcrypt, and the infrastructure layer provides disk encryption
  (LUKS/TDE via the hosting provider).
- **Revisit if:** card data gets stored, LGPD requires it, or the database
  migrates to native TDE.
