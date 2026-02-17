#!/bin/bash
input=$(cat)
remaining_pct=$(echo "$input" | jq -r '.context_window.remaining_percentage // 0')
total_input=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
context_size=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
remaining_k=$(( (context_size - total_input) / 1000 ))
total_k=$(( context_size / 1000 ))
printf 'Ctx remain: %s%% (%sk/%sk)' "$remaining_pct" "$remaining_k" "$total_k"
