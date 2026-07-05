import type { SchemaField } from '../components/calculator-v3/SchemaDrivenForm';

/** Builds a variables object from a field list's default_value_json. */
export function defaultVariablesFromFields(
  fields: SchemaField[],
): Record<string, unknown> {
  return Object.fromEntries(
    fields
      .filter((f) => f.default_value_json !== undefined)
      .map((f) => [f.field_key, f.default_value_json]),
  );
}
