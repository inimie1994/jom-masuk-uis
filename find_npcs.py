import json
import re

with open(r'C:\Users\Huawei\.gemini\antigravity\brain\199a1f91-66dd-497b-a05c-eaacac76e5f6\.system_generated\steps\959\output.txt', 'r') as f:
    content = f.read()

# Extract the JSON part between untrusted-data boundaries
match = re.search(r'<untrusted-data-[^>]+>(.*?)</untrusted-data-[^>]+>', content, re.DOTALL)
if match:
    json_str = match.group(1).strip()
    data = json.loads(json_str)
    grid = data[0]['grid_data']
    for y, row in enumerate(grid):
        for x, val in enumerate(row):
            if val in [103, 104]:
                print(f"Val {val} at y={y}, x={x}")
else:
    print("No untrusted-data match found")
