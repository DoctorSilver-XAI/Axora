/**
 * LGPI Facturation Schema V2
 * Complete JSON Schema for Mistral OCR Document Annotation
 * Handles both prescription-based and simple sales (patient/prescriber can be null)
 */

/**
 * BoundingBox definition for reuse
 */
const BOUNDING_BOX_DEF = {
    "type": "object",
    "properties": {
        "x_min": { "type": "number", "minimum": 0, "maximum": 1 },
        "y_min": { "type": "number", "minimum": 0, "maximum": 1 },
        "x_max": { "type": "number", "minimum": 0, "maximum": 1 },
        "y_max": { "type": "number", "minimum": 0, "maximum": 1 }
    },
    "required": ["x_min", "y_min", "x_max", "y_max"],
    "additionalProperties": false
};

/**
 * Complete LGPI Facturation Schema V2
 * This is the full schema object to be wrapped in document_annotation_format
 */
export const LGPI_FACTURATION_SCHEMA_V2 = {
    "name": "LGPI_Facturation_Screen_V2",
    "strict": true,
    "schema": {
        "type": "object",
        "properties": {
            "schema_version": {
                "type": "string",
                "enum": ["2.0"],
                "description": "Version du schéma. Utile pour gérer les évolutions côté pipeline."
            },
            "document_type": {
                "type": "string",
                "enum": ["lgpi_facturation_screen", "lgo_screen_other"],
                "description": "Type de document/screen."
            },
            "screen_context": {
                "type": "object",
                "description": "Contexte applicatif et état de l'écran.",
                "properties": {
                    "app": { "type": "string", "enum": ["LGPI"] },
                    "module": { "type": "string", "enum": ["Facturation"] },
                    "pharmacy_name": { "type": ["string", "null"] },
                    "user_display_name": { "type": ["string", "null"] },
                    "capture_datetime_raw": { "type": ["string", "null"], "description": "Ex: '23/08/2025 à 09:32'." },
                    "acts_count": { "type": ["integer", "null"], "minimum": 0 },
                    "invoice_progress": {
                        "type": ["object", "null"],
                        "properties": {
                            "current": { "type": ["integer", "null"], "minimum": 1 },
                            "total": { "type": ["integer", "null"], "minimum": 1 }
                        },
                        "additionalProperties": false
                    },
                    "dp_status": { "type": ["string", "null"], "enum": ["actif", "inexistant", "inconnu", null] },
                    "vitale_mode": { "type": ["string", "null"], "description": "Ex: 'VITALE'." },
                    "ins_status": { "type": ["string", "null"], "enum": ["present", "absent", "inconnu", null] },
                    "center_panel": { "type": ["string", "null"], "enum": ["comments", "stock_waiting", "other", null] },
                    "scor_status": { "type": ["string", "null"], "description": "Ex: 'SCOR' si visible." },
                    "cible_status": { "type": ["boolean", "null"] }
                },
                "required": ["app", "module"],
                "additionalProperties": false
            },
            "patient": {
                "type": ["object", "null"],
                "description": "Identité patient + couverture. Peut être null pour une vente simple.",
                "properties": {
                    "last_name": { "type": ["string", "null"] },
                    "first_name": { "type": ["string", "null"] },
                    "age_years": { "type": ["integer", "null"], "minimum": 0, "maximum": 120 },
                    "mandatory_insurance": {
                        "type": ["object", "null"],
                        "properties": {
                            "name": { "type": ["string", "null"], "description": "Ex: 'CPAM 831 TOULON', 'MSA REIMS'." },
                            "code": { "type": ["string", "null"], "description": "Code caisse/centre tel qu'affiché." }
                        },
                        "additionalProperties": false
                    },
                    "complementary_insurance": {
                        "type": ["object", "null"],
                        "properties": {
                            "name": { "type": ["string", "null"], "description": "Ex: 'AVENIR=VIAMEDIS', 'ALMERYS'." },
                            "code": { "type": ["string", "null"], "description": "Code AMC tel qu'affiché." }
                        },
                        "additionalProperties": false
                    },
                    "rights_status_raw": { "type": ["string", "null"], "description": "Ex: 'Droits ... dépassés'." },
                    "bounding_box": { "$ref": "#/$defs/BoundingBox" }
                },
                "additionalProperties": false
            },
            "prescriber": {
                "type": ["object", "null"],
                "description": "Informations prescripteur. Peut être null pour une vente simple.",
                "properties": {
                    "last_name": { "type": ["string", "null"] },
                    "first_name": { "type": ["string", "null"] },
                    "specialty": { "type": ["string", "null"] },
                    "bounding_box": { "$ref": "#/$defs/BoundingBox" }
                },
                "additionalProperties": false
            },
            "prescription": {
                "type": ["object", "null"],
                "description": "Informations liées à l'ordonnance.",
                "properties": {
                    "prescription_date_raw": { "type": ["string", "null"] },
                    "comment_text": { "type": ["string", "null"] },
                    "bounding_box": { "$ref": "#/$defs/BoundingBox" }
                },
                "additionalProperties": false
            },
            "stock_waiting": {
                "type": ["object", "null"],
                "description": "Bloc 'Quantité en attente de réception'.",
                "properties": {
                    "orders_distributor_qty": { "type": ["integer", "null"], "minimum": 0 },
                    "orders_direct_qty": { "type": ["integer", "null"], "minimum": 0 },
                    "dus_qty": { "type": ["integer", "null"], "minimum": 0 },
                    "available_qty": { "type": ["integer", "null"], "minimum": 0 },
                    "transmitted_at_raw": { "type": ["string", "null"] },
                    "bounding_box": { "$ref": "#/$defs/BoundingBox" }
                },
                "additionalProperties": false
            },
            "sales_metrics": {
                "type": ["object", "null"],
                "description": "Indicateurs visibles (dernière vente, CA...).",
                "properties": {
                    "last_sale_id": { "type": ["string", "null"] },
                    "last_sale_payment_eur": { "type": ["number", "null"], "minimum": 0 },
                    "ca_vd_eur": { "type": ["number", "null"], "minimum": 0 },
                    "ca_ordo_eur": { "type": ["number", "null"], "minimum": 0 },
                    "bounding_box": { "$ref": "#/$defs/BoundingBox" }
                },
                "additionalProperties": false
            },
            "alerts": {
                "type": "array",
                "description": "Alertes normalisées (DP, droits, messages).",
                "items": {
                    "type": "object",
                    "properties": {
                        "category": { "type": ["string", "null"], "enum": ["administratif", "facturation", "stock", "clinique", "inconnu", null] },
                        "message": { "type": "string" },
                        "severity": { "type": ["string", "null"], "enum": ["info", "warning", "critical", null] },
                        "bounding_box": { "$ref": "#/$defs/BoundingBox" }
                    },
                    "required": ["message"],
                    "additionalProperties": false
                }
            },
            "dispensation_lines": {
                "type": "array",
                "description": "Lignes de délivrance (tableau produits).",
                "items": {
                    "type": "object",
                    "properties": {
                        "line_no": { "type": ["integer", "null"], "minimum": 1 },
                        "product_type": { "type": ["string", "null"], "description": "Colonne 'Type' (ex: Nexo)." },
                        "flags": { "type": ["array", "null"], "items": { "type": "string" }, "description": "Marqueurs (ex: '1*', 'G', 'P')." },
                        "designation": { "type": "string", "minLength": 1 },
                        "quantity": { "type": ["integer", "null"], "minimum": 0 },
                        "unit_price_eur": { "type": ["number", "null"], "minimum": 0 },
                        "t_remb_raw": { "type": ["string", "null"], "description": "Valeur brute colonne 'T Remb'." },
                        "discount_raw": { "type": ["string", "null"], "description": "Valeur brute colonne 'Remise'." },
                        "honoraire_eur": { "type": ["number", "null"], "minimum": 0 },
                        "prestation_code": { "type": ["string", "null"], "description": "Colonne 'Prest' (ex: PH2, PH4, PH7)." },
                        "liste_raw": { "type": ["string", "null"], "description": "Colonne 'Liste'." },
                        "stock_level": { "type": ["integer", "null"], "minimum": 0 },
                        "dus": { "type": ["integer", "null"], "minimum": 0 },
                        "bounding_box": { "$ref": "#/$defs/BoundingBox" }
                    },
                    "required": ["designation"],
                    "additionalProperties": false
                }
            },
            "totals": {
                "type": ["object", "null"],
                "description": "Totaux de la vente en EUR.",
                "properties": {
                    "currency": { "type": "string", "enum": ["EUR"] },
                    "total_amount_eur": { "type": ["number", "null"], "minimum": 0 },
                    "patient_share_eur": { "type": ["number", "null"], "minimum": 0, "description": "Part Ass affichée." },
                    "line_amount_eur": { "type": ["number", "null"], "minimum": 0, "description": "Montant 'Ligne' si affiché." },
                    "remote_deposit": { "type": ["integer", "null"], "minimum": 0, "description": "Dépôt distant si affiché." },
                    "number_of_lines": { "type": ["integer", "null"], "minimum": 0 },
                    "bounding_box": { "$ref": "#/$defs/BoundingBox" }
                },
                "additionalProperties": false
            },
            "zones": {
                "type": "array",
                "description": "Preuves OCR: zones détectées + texte brut + bbox.",
                "items": {
                    "type": "object",
                    "properties": {
                        "zone_id": { "type": "string", "description": "Identifiant unique de la zone (ex: 'z_patient_1')." },
                        "zone_name": { "type": "string", "description": "Nom lisible de la zone." },
                        "zone_type": {
                            "type": "string",
                            "enum": ["header", "patient_identity", "prescriber", "center_panel", "alerts", "dispensation_grid", "totals", "follow_up", "actions", "other"]
                        },
                        "bounding_box": { "$ref": "#/$defs/BoundingBox" },
                        "extracted_text": { "type": ["string", "null"] },
                        "confidence": { "type": ["number", "null"], "minimum": 0, "maximum": 1 }
                    },
                    "required": ["zone_id", "zone_name", "zone_type", "bounding_box"],
                    "additionalProperties": false
                }
            }
        },
        "required": ["schema_version", "document_type", "screen_context", "zones"],
        "additionalProperties": false,
        "$defs": {
            "BoundingBox": BOUNDING_BOX_DEF
        }
    }
};

/**
 * Legacy schema export for backwards compatibility
 * @deprecated Use LGPI_FACTURATION_SCHEMA_V2 instead
 */
export const LGPI_FACTURATION_SCHEMA = LGPI_FACTURATION_SCHEMA_V2;
