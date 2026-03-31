Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('C:\Users\Huawei\Documents\App Development\CampusQuest PWA\assets\animated male character\map\paint map.png')
$grid = @()
$cellW = $bmp.Width / 59.0
$cellH = $bmp.Height / 72.0

for ($y = 0; $y -lt 72; $y++) {
    $row = @()
    for ($x = 0; $x -lt 59; $x++) {
        $px = [int][Math]::Round($x * $cellW + $cellW / 2.0)
        $py = [int][Math]::Round($y * $cellH + $cellH / 2.0)
        
        # Ensure within bounds
        if ($px -ge $bmp.Width) { $px = $bmp.Width - 1 }
        if ($py -ge $bmp.Height) { $py = $bmp.Height - 1 }
        
        $color = $bmp.GetPixel($px, $py)
        # Check if black or dark (obstruction), also check opacity if any
        if ($color.R -lt 50 -and $color.G -lt 50 -and $color.B -lt 50 -and $color.A -gt 100) {
            $row += 1  # 1 is wall
        } else {
            $row += 0  # 0 is grass
        }
    }
    $grid += ,$row
}

$bmp.Dispose()

# Convert to JSON string
$json = "["
for ($y = 0; $y -lt 72; $y++) {
    $json += "[" + ($grid[$y] -join ",") + "]"
    if ($y -lt 71) { $json += "," }
}
$json += "]"

Out-File -FilePath "C:\Users\Huawei\Documents\App Development\CampusQuest PWA\grid_data.json" -InputObject $json -Encoding ASCII
Write-Host "Done parsing grids!"
