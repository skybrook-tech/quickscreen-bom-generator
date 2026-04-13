import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { SavedQuote } from '../../types/quote.types';

const s = StyleSheet.create({
  page:        { padding: 40, fontFamily: 'Helvetica', fontSize: 9, color: '#1a1a2e' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  brandPrimary:{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#3b82f6' },
  brandSecond: { fontSize: 10, color: '#6b7280' },
  section:     { marginBottom: 14 },
  sectionTitle:{ fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 3 },
  row:         { flexDirection: 'row', marginBottom: 3 },
  label:       { width: 120, color: '#6b7280' },
  value:       { flex: 1 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: '4 6', fontFamily: 'Helvetica-Bold' },
  tableRow:    { flexDirection: 'row', padding: '3 6', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  colCode:     { width: 110 },
  colDesc:     { flex: 1 },
  colUnit:     { width: 40, textAlign: 'center' },
  colQty:      { width: 30, textAlign: 'right' },
  colPrice:    { width: 55, textAlign: 'right' },
  colTotal:    { width: 60, textAlign: 'right' },
  totalRow:    { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  totalLabel:  { width: 100, textAlign: 'right', color: '#6b7280', marginRight: 8 },
  totalValue:  { width: 70, textAlign: 'right' },
  grandTotal:  { fontFamily: 'Helvetica-Bold', fontSize: 10 },
  footer:      { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#9ca3af', fontSize: 8 },
});

interface QuotePDFTemplateProps {
  quote: SavedQuote;
}

export function QuotePDFTemplate({ quote }: QuotePDFTemplateProps) {
  const { bom, fence_config: fc, gates, contact, customer_ref, notes } = quote;
  const allItems = [...(bom.fenceItems ?? []), ...(bom.gateItems ?? [])];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brandPrimary}>SkybrookAI</Text>
            <Text style={s.brandSecond}>The Glass Outlet — QuickScreen BOM</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{customer_ref || 'Quote'}</Text>
            <Text style={{ color: '#6b7280' }}>
              {new Date(quote.created_at).toLocaleDateString('en-AU')}
            </Text>
          </View>
        </View>

        {/* Contact */}
        {contact?.fullName && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Customer</Text>
            <View style={s.row}><Text style={s.label}>Name</Text><Text style={s.value}>{contact.fullName}</Text></View>
            {contact.company    && <View style={s.row}><Text style={s.label}>Company</Text><Text style={s.value}>{contact.company}</Text></View>}
            {contact.phone      && <View style={s.row}><Text style={s.label}>Phone</Text><Text style={s.value}>{contact.phone}</Text></View>}
            {contact.email      && <View style={s.row}><Text style={s.label}>Email</Text><Text style={s.value}>{contact.email}</Text></View>}
            {contact.deliveryAddress && (
              <View style={s.row}>
                <Text style={s.label}>Delivery</Text>
                <View style={s.value}>
                  <Text>{contact.deliveryAddress}</Text>
                  {contact.deliverySuburb && <Text>{contact.deliverySuburb}</Text>}
                </View>
              </View>
            )}
            <View style={s.row}><Text style={s.label}>Fulfilment</Text><Text style={s.value}>{contact.fulfilment}</Text></View>
          </View>
        )}

        {/* Fence config summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Fence Specification</Text>
          <View style={s.row}><Text style={s.label}>System</Text><Text style={s.value}>{fc.systemType}</Text></View>
          <View style={s.row}><Text style={s.label}>Run Length</Text><Text style={s.value}>{fc.totalRunLength}m</Text></View>
          <View style={s.row}><Text style={s.label}>Target Height</Text><Text style={s.value}>{fc.targetHeight}mm</Text></View>
          <View style={s.row}><Text style={s.label}>Slat</Text><Text style={s.value}>{fc.slatSize}mm · {fc.slatGap}mm gap</Text></View>
          <View style={s.row}><Text style={s.label}>Colour</Text><Text style={s.value}>{fc.colour}</Text></View>
          <View style={s.row}><Text style={s.label}>Max Panel Width</Text><Text style={s.value}>{fc.maxPanelWidth}mm</Text></View>
          <View style={s.row}><Text style={s.label}>Post Mounting</Text><Text style={s.value}>{fc.postMounting}</Text></View>
          <View style={s.row}><Text style={s.label}>Corners</Text><Text style={s.value}>{fc.corners}</Text></View>
        </View>

        {/* Gates */}
        {gates.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Gates ({gates.length})</Text>
            {gates.map((g, i) => (
              <View key={g.id} style={s.row}>
                <Text style={s.label}>Gate {i + 1}</Text>
                <Text style={s.value}>
                  {g.gateType} · {g.openingWidth}mm wide · {g.gatePostSize} post
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* BOM table */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Bill of Materials</Text>
          <View style={s.tableHeader}>
            <Text style={s.colCode}>Code</Text>
            <Text style={s.colDesc}>Description</Text>
            <Text style={s.colUnit}>Unit</Text>
            <Text style={s.colQty}>Qty</Text>
            <Text style={s.colPrice}>Unit Price</Text>
            <Text style={s.colTotal}>Total</Text>
          </View>
          {allItems.map((item) => (
            <View key={item.sku} style={s.tableRow}>
              <Text style={s.colCode}>{item.sku}</Text>
              <Text style={s.colDesc}>{item.description}</Text>
              <Text style={s.colUnit}>{item.unit}</Text>
              <Text style={s.colQty}>{item.quantity}</Text>
              <Text style={s.colPrice}>${item.unitPrice.toFixed(2)}</Text>
              <Text style={s.colTotal}>${item.lineTotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalRow}><Text style={s.totalLabel}>Subtotal (ex-GST)</Text><Text style={s.totalValue}>${bom.total.toFixed(2)}</Text></View>
        <View style={s.totalRow}><Text style={s.totalLabel}>GST (10%)</Text><Text style={s.totalValue}>${bom.gst.toFixed(2)}</Text></View>
        <View style={s.totalRow}>
          <Text style={[s.totalLabel, s.grandTotal]}>Total (inc. GST)</Text>
          <Text style={[s.totalValue, s.grandTotal]}>${bom.grandTotal.toFixed(2)}</Text>
        </View>

        {/* Notes */}
        {notes && (
          <View style={{ marginTop: 14 }}>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text>{notes}</Text>
          </View>
        )}

        <Text style={s.footer}>
          Generated by SkybrookAI for The Glass Outlet · {new Date().toLocaleDateString('en-AU')} · Prices ex-GST unless noted
        </Text>
      </Page>
    </Document>
  );
}
