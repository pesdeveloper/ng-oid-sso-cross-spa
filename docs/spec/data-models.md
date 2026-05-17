# Data Models Specification

## Overview
This document outlines the data structures, interfaces, and DTOs used within the `ng-oid-sso-cross-spa` frontend application. It describes how data from backend services is typed and mapped within the Angular application.

## Core Models

### `BasicResponse`
Located at `src/app/core/models/basic.model.ts`, this interface represents the primary data structure returned by the core service layer (e.g., when fetching subject/account details).

```typescript
export interface BasicResponse {
  id_Suj: number;
  id_Bie: number;
  sujDeno: string;
  siBloqueOperativo: boolean;
  siBaja: boolean;
  enVerificacion: boolean;
  siComTipoGrande: boolean;
  esMoto: boolean;
  titulares: string;
  titularesAsArray: string[];
  id_Tit: number;
  id_Per_Tit: number;
  id_Bco: number;
  tipoCtaBco: string | null;
  cuentaBco: string | null;
  observacion: string | null;
  cbu: string | null;
  bco_Deno: string | null;
  codBanco: string | null;
}
```

#### Field Descriptions:
- **`id_Suj`** / **`id_Bie`**: Identifiers for Subject (Sujeto) and Asset (Bien/Cuenta).
- **`sujDeno`**: Denomination or name of the subject.
- **Flags/Status (`boolean`)**:
  - `siBloqueOperativo`: Indicates if there is an operational block.
  - `siBaja`: Indicates if the asset/subject is inactive or discharged.
  - `enVerificacion`: Indicates if it is under verification.
  - `siComTipoGrande`: Indicates if it belongs to a large taxpayer/commercial type.
  - `esMoto`: Specific flag for vehicle type.
- **Ownership**:
  - `titulares`: A string representation of the owners.
  - `titularesAsArray`: Array of strings for individual owner names.
  - `id_Tit` / `id_Per_Tit`: Identifiers for the owner's title and person.
- **Banking Info**:
  - `id_Bco`: Bank identifier.
  - `tipoCtaBco`: Type of bank account (nullable).
  - `cuentaBco`: Bank account number (nullable).
  - `cbu`: CBU (Clave Bancaria Uniforme) (nullable).
  - `bco_Deno`: Bank denomination/name (nullable).
  - `codBanco`: Bank code (nullable).
- **`observacion`**: Additional notes (nullable).

## Future Extensibility
Currently, the application relies on a minimal set of models centered around account/subject retrieval. As features expand, DTOs should be segregated by feature (e.g., `src/app/core/models/auth.model.ts`, `src/app/features/<feature>/models/`) and strictly adhere to TypeScript's strict null checks as demonstrated by `BasicResponse`.
