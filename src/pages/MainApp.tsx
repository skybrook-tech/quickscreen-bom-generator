import { AppShell } from '../components/layout/AppShell';
import { FenceConfigForm } from '../components/fence/FenceConfigForm';
import { GateConfigPanel } from '../components/gate/GateConfigPanel';
import { FenceConfigProvider } from '../context/FenceConfigContext';
import { GateProvider } from '../context/GateContext';
import { AccordionSection } from '../components/shared/AccordionSection';

export function MainApp() {
  return (
    <FenceConfigProvider>
      <GateProvider>
        <AppShell>
          <div className="p-4 sm:p-6">
            <div className="max-w-5xl mx-auto space-y-4">

              <AccordionSection title="Fence Configuration">
                <div className="pt-4">
                  <FenceConfigForm
                    onGenerate={(config) => {
                      // Phase 4: call calculate-bom edge function
                      console.log('Generate BOM:', config);
                    }}
                  />
                </div>
              </AccordionSection>

              <AccordionSection title="Gate Configuration">
                <div className="pt-4">
                  <GateConfigPanel />
                </div>
              </AccordionSection>

              {/* Phase 4: BOM Display goes here */}

            </div>
          </div>
        </AppShell>
      </GateProvider>
    </FenceConfigProvider>
  );
}
