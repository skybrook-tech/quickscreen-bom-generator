import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { EngineTable, type ColumnDef } from '../../components/admin/EngineTable';
import { PricingWarningBadge } from '../../components/admin/PricingWarningBadge';
import { SharedByBadge } from '../../components/admin/SharedByBadge';
import { useAdminProducts } from '../../hooks/useAdminProducts';
import { useProductEngineData } from '../../hooks/useProductEngineData';
import { useProductComponentsBySystemType } from '../../hooks/useProductComponents';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab =
  | 'variables'
  | 'rules'
  | 'constraints'
  | 'validations'
  | 'selectors'
  | 'companions'
  | 'warnings'
  | 'components';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'variables', label: 'Variables' },
  { id: 'rules', label: 'Rules' },
  { id: 'constraints', label: 'Constraints' },
  { id: 'validations', label: 'Validations' },
  { id: 'selectors', label: 'Selectors' },
  { id: 'companions', label: 'Companions' },
  { id: 'warnings', label: 'Warnings' },
  { id: 'components', label: 'Components' },
];

// ─── Column definitions ───────────────────────────────────────────────────────

const VARIABLES_COLS: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, width: 'w-32' },
  { key: 'label', label: 'Label', type: 'text', required: true },
  {
    key: 'data_type', label: 'Data Type', type: 'select', required: true,
    options: [
      { value: 'text', label: 'text' },
      { value: 'number', label: 'number' },
      { value: 'integer', label: 'integer' },
      { value: 'boolean', label: 'boolean' },
      { value: 'enum', label: 'enum' },
    ],
  },
  {
    key: 'scope', label: 'Scope', type: 'select', required: true,
    options: [
      { value: 'job', label: 'job' },
      { value: 'run', label: 'run' },
      { value: 'segment', label: 'segment' },
    ],
  },
  { key: 'unit', label: 'Unit', type: 'text' },
  { key: 'required', label: 'Required', type: 'boolean' },
  { key: 'sort_order', label: 'Sort', type: 'number', width: 'w-16' },
  { key: 'default_value_json', label: 'Default', type: 'json', modalOnly: false },
  { key: 'options_json', label: 'Options', type: 'json', modalOnly: false },
  { key: 'options_group', label: 'Options Group', type: 'text', modalOnly: false },
  { key: 'active', label: 'Active', type: 'boolean' },
];

const RULES_COLS: ColumnDef[] = [
  {
    key: 'stage', label: 'Stage', type: 'select', required: true, width: 'w-24',
    options: [
      { value: 'derive', label: 'derive' },
      { value: 'stock', label: 'stock' },
      { value: 'accessory', label: 'accessory' },
      { value: 'component', label: 'component' },
    ],
  },
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'output_key', label: 'Output Key', type: 'text', required: true, width: 'w-28' },
  { key: 'priority', label: 'Pri', type: 'number', width: 'w-14' },
  { key: 'expression', label: 'Expression', type: 'textarea', required: true },
  { key: 'notes', label: 'Notes', type: 'textarea', modalOnly: true },
  { key: 'active', label: 'Active', type: 'boolean', width: 'w-16' },
  { key: 'rule_set_id', label: 'Rule Set', type: 'text', modalOnly: true },
  { key: 'version_id', label: 'Version', type: 'text', modalOnly: true },
];

const CONSTRAINTS_COLS: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  {
    key: 'constraint_type', label: 'Type', type: 'select', required: true, width: 'w-24',
    options: [
      { value: 'min', label: 'min' },
      { value: 'max', label: 'max' },
      { value: 'threshold', label: 'threshold' },
      { value: 'enum', label: 'enum' },
    ],
  },
  { key: 'value_text', label: 'Value', type: 'text', required: true },
  { key: 'unit', label: 'Unit', type: 'text', width: 'w-20' },
  {
    key: 'severity', label: 'Severity', type: 'select', required: true, width: 'w-20',
    options: [
      { value: 'error', label: 'error' },
      { value: 'warning', label: 'warning' },
    ],
  },
  { key: 'applies_when_json', label: 'When', type: 'json' },
  { key: 'message', label: 'Message', type: 'textarea', required: true },
  { key: 'active', label: 'Active', type: 'boolean' },
];

const VALIDATIONS_COLS: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'expression', label: 'Expression', type: 'textarea', required: true },
  {
    key: 'severity', label: 'Severity', type: 'select', required: true, width: 'w-20',
    options: [
      { value: 'error', label: 'error' },
      { value: 'warning', label: 'warning' },
    ],
  },
  { key: 'message', label: 'Message', type: 'textarea', required: true },
  { key: 'active', label: 'Active', type: 'boolean' },
];

const SELECTORS_COLS: ColumnDef[] = [
  { key: 'selector_key', label: 'Key', type: 'text', required: true, width: 'w-36' },
  { key: 'component_category', label: 'Category', type: 'text', required: true, width: 'w-28' },
  { key: 'selector_type', label: 'Sel Type', type: 'text', width: 'w-20' },
  { key: 'sku_pattern', label: 'SKU Pattern', type: 'text', required: true },
  { key: 'qty_key', label: 'Qty Key', type: 'text', width: 'w-24' },
  { key: 'priority', label: 'Pri', type: 'number', width: 'w-14' },
  { key: 'match_json', label: 'Match', type: 'json' },
  { key: 'notes', label: 'Notes', type: 'textarea', modalOnly: true },
  { key: 'active', label: 'Active', type: 'boolean' },
];

const COMPANIONS_COLS: ColumnDef[] = [
  { key: 'rule_key', label: 'Key', type: 'text', required: true, width: 'w-36' },
  { key: 'trigger_category', label: 'Trigger Cat', type: 'text', required: true, width: 'w-28' },
  { key: 'add_category', label: 'Add Cat', type: 'text', required: true, width: 'w-24' },
  { key: 'add_sku_pattern', label: 'Add SKU', type: 'text', required: true },
  { key: 'qty_formula', label: 'Qty Formula', type: 'text', required: true },
  { key: 'is_pack', label: 'Is Pack', type: 'boolean' },
  { key: 'priority', label: 'Pri', type: 'number', width: 'w-14' },
  { key: 'trigger_match_json', label: 'Trigger Match', type: 'json', modalOnly: false },
  { key: 'notes', label: 'Notes', type: 'textarea', modalOnly: true },
  { key: 'active', label: 'Active', type: 'boolean' },
];

const WARNINGS_COLS: ColumnDef[] = [
  { key: 'warning_key', label: 'Key', type: 'text', required: true, width: 'w-36' },
  {
    key: 'severity', label: 'Severity', type: 'select', required: true, width: 'w-20',
    options: [
      { value: 'error', label: 'error' },
      { value: 'warning', label: 'warning' },
      { value: 'info', label: 'info' },
    ],
  },
  { key: 'condition_json', label: 'Condition', type: 'json' },
  { key: 'message', label: 'Message', type: 'textarea', required: true },
  { key: 'active', label: 'Active', type: 'boolean' },
];

// ─── Mutation helpers ─────────────────────────────────────────────────────────

type MutationFn<T> = (row: Partial<T>, isNew: boolean) => Promise<void>;
type DeleteFn = (id: string) => Promise<void>;

function makeMutations<T extends { id: string }>(
  table: string,
  productId: string,
  orgId: string,
  qc: ReturnType<typeof useQueryClient>,
  extra?: Record<string, unknown>
): { onSave: MutationFn<T>; onDelete: DeleteFn } {
  const invalidate = () => qc.invalidateQueries({ queryKey: [`admin-${table}`, productId] });

  return {
    onSave: async (row, isNew) => {
      if (isNew) {
        const { error } = await supabase
          .from(table)
          .insert({ ...extra, ...row, org_id: orgId, product_id: productId });
        if (error) throw new Error(error.message);
      } else {
        const { id, org_id: _o, product_id: _p, created_at: _c, updated_at: _u, ...rest } = row as Record<string, unknown>;
        const { error } = await supabase.from(table).update(rest).eq('id', id as string);
        if (error) throw new Error(error.message);
      }
      await invalidate();
    },
    onDelete: async (id) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
      await invalidate();
    },
  };
}

// ─── Components tab ───────────────────────────────────────────────────────────

function ComponentsTab({ systemType }: { systemType: string }) {
  const { data: components, isLoading } = useProductComponentsBySystemType(systemType);

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-brand-muted animate-pulse">Loading…</div>;
  }

  const unpricedCount = components?.filter((c) => !c.hasPricing).length ?? 0;

  return (
    <div>
      {unpricedCount > 0 && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
          <AlertCircle size={13} />
          {unpricedCount} component{unpricedCount !== 1 ? 's' : ''} without pricing rules
        </div>
      )}

      <div className="text-xs text-brand-muted mb-3">{components?.length ?? 0} components</div>

      {!components || components.length === 0 ? (
        <div className="py-10 text-center text-sm text-brand-muted border border-dashed border-brand-border rounded-lg">
          No components found for {systemType}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-brand-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg/50">
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">SKU</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Name</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Category</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Unit</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Used By</th>
                <th className="px-3 py-2.5 text-left font-medium text-brand-muted">Pricing</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-b border-brand-border/50 hover:bg-brand-border/10 ${
                    !c.hasPricing ? 'bg-amber-500/5' : i % 2 === 0 ? '' : 'bg-brand-bg/30'
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-brand-text">{c.sku}</td>
                  <td className="px-3 py-2 text-brand-text">{c.name}</td>
                  <td className="px-3 py-2 text-brand-muted">{c.category}</td>
                  <td className="px-3 py-2 text-brand-muted">{c.unit}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.system_types.map((st) => (
                        <span
                          key={st}
                          className={`text-xs px-1.5 py-0.5 rounded border ${
                            st === systemType
                              ? 'text-brand-accent bg-brand-accent/10 border-brand-accent/30'
                              : 'text-brand-muted bg-brand-bg border-brand-border'
                          }`}
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                    <SharedByBadge systemTypes={c.system_types} className="mt-1" />
                  </td>
                  <td className="px-3 py-2">
                    <PricingWarningBadge hasPricing={c.hasPricing} count={c.pricingCount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Rule Sets summary ────────────────────────────────────────────────────────

function RuleSetsInfo({ productId }: { productId: string }) {
  const { ruleSets } = useProductEngineData(productId);
  if (!ruleSets.data || ruleSets.data.length === 0) return null;

  return (
    <div className="mb-4 p-3 bg-brand-bg rounded-lg border border-brand-border/50 text-xs">
      <span className="text-brand-muted font-medium">Rule Sets: </span>
      {ruleSets.data.map((rs) => {
        const current = rs.rule_versions?.find((v) => v.is_current);
        return (
          <span key={rs.id} className="ml-2">
            <span className="text-brand-text">{rs.name}</span>
            {current && (
              <span className="text-brand-muted ml-1">
                ({current.version_label}
                {current.notes ? ` — ${current.notes}` : ''})
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProductDetailPage() {
  const { id: productId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('variables');
  const qc = useQueryClient();

  const { data: products } = useAdminProducts();
  const profile = useProfile();
  const engineData = useProductEngineData(productId ?? null);

  const product = products?.find((p) => p.id === productId);
  const orgId = profile.orgId ?? '';

  // Determine the current rule version ID for new rules
  const currentRuleVersion = engineData.ruleSets.data
    ?.flatMap((rs) => rs.rule_versions)
    .find((v) => v.is_current);

  if (!product && products) {
    return (
      <AdminLayout title="Product not found">
        <Link to="/admin/products" className="text-sm text-brand-accent hover:underline flex items-center gap-1.5">
          <ArrowLeft size={13} />
          Back to products
        </Link>
      </AdminLayout>
    );
  }

  const productName = product?.name ?? 'Loading…';
  const systemType = product?.system_type ?? '';

  // ─ Mutation factories per table ─────────────────────────────────────────
  const variableMut = makeMutations('product_variables', productId!, orgId, qc);
  const ruleMut = makeMutations('product_rules', productId!, orgId, qc, {
    rule_set_id: currentRuleVersion ? engineData.ruleSets.data?.[0]?.id : undefined,
    version_id: currentRuleVersion?.id,
  });
  const constraintMut = makeMutations('product_constraints', productId!, orgId, qc);
  const validationMut = makeMutations('product_validations', productId!, orgId, qc);
  const selectorMut = makeMutations('product_component_selectors', productId!, orgId, qc);
  const companionMut = makeMutations('product_companion_rules', productId!, orgId, qc);
  const warningMut = makeMutations('product_warnings', productId!, orgId, qc);

  return (
    <AdminLayout
      title={productName}
      subtitle={`${product?.system_type ?? ''} · ${product?.product_type ?? ''}`}
    >
      <div className="mb-4">
        <Link
          to="/admin/products"
          className="text-xs text-brand-muted hover:text-brand-accent flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={12} />
          All products
        </Link>
      </div>

      {productId && <RuleSetsInfo productId={productId} />}

      {/* Tabs */}
      <div className="flex items-center gap-0.5 border-b border-brand-border mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const queryKey = tab.id === 'rules'
            ? engineData.rules
            : tab.id === 'variables'
            ? engineData.variables
            : tab.id === 'constraints'
            ? engineData.constraints
            : tab.id === 'validations'
            ? engineData.validations
            : tab.id === 'selectors'
            ? engineData.selectors
            : tab.id === 'companions'
            ? engineData.companions
            : tab.id === 'warnings'
            ? engineData.warnings
            : null;

          const count = queryKey?.data?.length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-brand-muted hover:text-brand-text'
              }`}
            >
              {tab.label}
              {count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-brand-accent/20 text-brand-accent'
                      : 'bg-brand-border/40 text-brand-muted'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'variables' && (
          <EngineTable
            columns={VARIABLES_COLS}
            data={engineData.variables.data ?? []}
            isLoading={engineData.variables.isLoading}
            defaultValues={{ active: true, sort_order: 0, options_json: [] } as never}
            onSave={variableMut.onSave}
            onDelete={variableMut.onDelete}
            entityLabel="variable"
            emptyMessage="No variables defined for this product"
          />
        )}

        {activeTab === 'rules' && (
          <>
            {!currentRuleVersion && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                <AlertCircle size={13} />
                No current rule version found. Create a rule set and version before adding rules.
              </div>
            )}
            <EngineTable
              columns={RULES_COLS}
              data={engineData.rules.data ?? []}
              isLoading={engineData.rules.isLoading}
              defaultValues={{
                active: true,
                priority: 0,
                stage: 'derive',
                rule_set_id: engineData.ruleSets.data?.[0]?.id,
                version_id: currentRuleVersion?.id,
              } as never}
              onSave={ruleMut.onSave}
              onDelete={ruleMut.onDelete}
              entityLabel="rule"
              emptyMessage="No rules defined for this product"
            />
          </>
        )}

        {activeTab === 'constraints' && (
          <EngineTable
            columns={CONSTRAINTS_COLS}
            data={engineData.constraints.data ?? []}
            isLoading={engineData.constraints.isLoading}
            defaultValues={{ active: true, applies_when_json: {} } as never}
            onSave={constraintMut.onSave}
            onDelete={constraintMut.onDelete}
            entityLabel="constraint"
            emptyMessage="No constraints defined for this product"
          />
        )}

        {activeTab === 'validations' && (
          <EngineTable
            columns={VALIDATIONS_COLS}
            data={engineData.validations.data ?? []}
            isLoading={engineData.validations.isLoading}
            defaultValues={{ active: true } as never}
            onSave={validationMut.onSave}
            onDelete={validationMut.onDelete}
            entityLabel="validation"
            emptyMessage="No validations defined for this product"
          />
        )}

        {activeTab === 'selectors' && (
          <EngineTable
            columns={SELECTORS_COLS}
            data={engineData.selectors.data ?? []}
            isLoading={engineData.selectors.isLoading}
            defaultValues={{ active: true, priority: 100, match_json: {} } as never}
            onSave={selectorMut.onSave}
            onDelete={selectorMut.onDelete}
            entityLabel="selector"
            emptyMessage="No selectors defined for this product"
          />
        )}

        {activeTab === 'companions' && (
          <EngineTable
            columns={COMPANIONS_COLS}
            data={engineData.companions.data ?? []}
            isLoading={engineData.companions.isLoading}
            defaultValues={{ active: true, is_pack: false, priority: 100, trigger_match_json: {} } as never}
            onSave={companionMut.onSave}
            onDelete={companionMut.onDelete}
            entityLabel="companion rule"
            emptyMessage="No companion rules defined for this product"
          />
        )}

        {activeTab === 'warnings' && (
          <EngineTable
            columns={WARNINGS_COLS}
            data={engineData.warnings.data ?? []}
            isLoading={engineData.warnings.isLoading}
            defaultValues={{ active: true, condition_json: {} } as never}
            onSave={warningMut.onSave}
            onDelete={warningMut.onDelete}
            entityLabel="warning"
            emptyMessage="No warnings defined for this product"
          />
        )}

        {activeTab === 'components' && systemType && (
          <ComponentsTab systemType={systemType} />
        )}
      </div>
    </AdminLayout>
  );
}
