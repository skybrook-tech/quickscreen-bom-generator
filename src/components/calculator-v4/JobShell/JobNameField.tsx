import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { Input } from "../../ui/Input";

export function JobNameField() {
  const { state, dispatch } = useCalculatorV4();

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-brand-muted">
        Job name
      </label>
      <Input
        type="text"
        placeholder="Enter job name"
        value={state.jobName}
        onChange={(e) => dispatch({ type: "SET_JOB_NAME", name: e.target.value })}
        className="w-full"
        data-testid="v4-job-name"
      />
    </div>
  );
}
