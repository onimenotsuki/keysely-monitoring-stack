"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseDbSecret = createSupabaseDbSecret;
const k8s = __importStar(require("@pulumi/kubernetes"));
/**
 * Optional Secret used by operators when wiring Grafana / exporters to Supabase.
 * Set config keys with `pulumi config set --secret` (see docs/supabase-grafana.md).
 */
function createSupabaseDbSecret(provider, namespace, cfg) {
    const host = cfg.get("supabaseDbHost") ?? cfg.getSecret("supabaseDbHost");
    if (!host) {
        return undefined;
    }
    const user = cfg.requireSecret("supabaseDbUser");
    const password = cfg.requireSecret("supabaseDbPassword");
    const database = cfg.get("supabaseDbName") ?? "postgres";
    const sslMode = cfg.get("supabaseDbSslMode") ?? "require";
    return new k8s.core.v1.Secret("supabase-db-credentials", {
        metadata: {
            name: "supabase-db-credentials",
            namespace,
            labels: {
                "app.kubernetes.io/name": "supabase-db-credentials",
                "keysely.dev/component": "observability",
            },
        },
        type: "Opaque",
        stringData: {
            DB_HOST: host,
            DB_USER: user,
            DB_PASSWORD: password,
            DB_NAME: database,
            DB_SSLMODE: sslMode,
        },
    }, { provider });
}
//# sourceMappingURL=supabaseCredentialsSecret.js.map