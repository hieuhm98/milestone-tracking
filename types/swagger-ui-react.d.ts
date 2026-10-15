// swagger-ui-react ships no types, and @types/swagger-ui-react targets React 19
// (it fails against this project's React 18 JSX types). This covers the props
// components/sandbox/SwaggerPanel.tsx uses.
declare module "swagger-ui-react" {
  import type { ComponentType } from "react";

  export interface SwaggerUIProps {
    url?: string;
    spec?: object;
    deepLinking?: boolean;
    tryItOutEnabled?: boolean;
    displayRequestDuration?: boolean;
    persistAuthorization?: boolean;
    filter?: boolean | string;
    defaultModelsExpandDepth?: number;
    docExpansion?: "list" | "full" | "none";
    onComplete?: (system: never) => void;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
