#!/usr/bin/env bash

# 1. Define your parallel sub-tasks
declare -A TASKS=(
    ["Frontend"]="Build responsive React UI dashboard components"
    ["Backend"]="Generate Express API routes and database schemas"
    ["Security"]="Scan dependencies and verify JWT authentication"
)

# Initialize tracking arrays
pids=()
logs=()

echo "🚀 Launching parallel Antigravity workers..."

# 2. Spawn sub-agents concurrently in the background
for role in "${!TASKS[@]}"; do
    task_desc="${TASKS[$role]}"
    log_file="/tmp/antigravity_${role,,}.log"
    logs+=("$log_file")
    
    echo "  -> Starting [$role] worker..."
    
    # Run codex in the background, isolating output to distinct logs
    codex "$task_desc" > "$log_file" 2>&1 &
    
    # Capture the Process ID (PID) of the background agent
    pids+=($!)
done

echo "⏳ All agents dispatched. Waiting for completion..."

# 3. Monitor background workers and collect exit codes
exit_code=0
for i in "${!pids[@]}"; do
    pid="${pids[$i]}"
    wait "$pid"
    status=$?
    
    if [ $status -ne 0 ]; then
        echo "❌ Worker with PID $pid failed with status $status."
        exit_code=1
    fi
done

# 4. Aggregation Phase: Print isolated outputs for the main orchestrator
echo -e "\n📊 All workers finished. Compiling execution summaries:\n"
echo "=================================================="

for log in "${logs[@]}"; do
    worker_name=$(basename "$log" .log | sed 's/antigravity_//' | tr '[:lower:]' '[:upper:]')
    echo "=== [$worker_name WORKER OUTPUT] ==="
    cat "$log"
    echo -e "==================================================\n"
    rm -f "$log" # Clean up temporary logs
done

exit $exit_code
