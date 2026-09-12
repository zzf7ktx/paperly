Add-Type -AssemblyName System.Drawing

$outputDirectory = Join-Path $PSScriptRoot '..\build'
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

$size = 256
$scale = $size / 32
$bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)

$background = [System.Drawing.ColorTranslator]::FromHtml('#f2efe8')
$ink = [System.Drawing.ColorTranslator]::FromHtml('#16302b')
$accent = [System.Drawing.ColorTranslator]::FromHtml('#ff765f')

$backgroundPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 8 * $scale
$diameter = $radius * 2
$backgroundPath.AddArc(0, 0, $diameter, $diameter, 180, 90)
$backgroundPath.AddArc($size - $diameter, 0, $diameter, $diameter, 270, 90)
$backgroundPath.AddArc($size - $diameter, $size - $diameter, $diameter, $diameter, 0, 90)
$backgroundPath.AddArc(0, $size - $diameter, $diameter, $diameter, 90, 90)
$backgroundPath.CloseFigure()
$graphics.FillPath((New-Object System.Drawing.SolidBrush($background)), $backgroundPath)

$letter = New-Object System.Drawing.Drawing2D.GraphicsPath([System.Drawing.Drawing2D.FillMode]::Alternate)
$letter.StartFigure()
$letter.AddLine(9 * $scale, 7.5 * $scale, 17.2 * $scale, 7.5 * $scale)
$letter.AddBezier(17.2 * $scale, 7.5 * $scale, 22.2 * $scale, 7.5 * $scale, 25 * $scale, 10 * $scale, 25 * $scale, 14 * $scale)
$letter.AddBezier(25 * $scale, 14 * $scale, 25 * $scale, 18.2 * $scale, 21.9 * $scale, 20.8 * $scale, 16.8 * $scale, 20.8 * $scale)
$letter.AddLine(16.8 * $scale, 20.8 * $scale, 14.2 * $scale, 20.8 * $scale)
$letter.AddLine(14.2 * $scale, 20.8 * $scale, 14.2 * $scale, 25.5 * $scale)
$letter.AddLine(14.2 * $scale, 25.5 * $scale, 9 * $scale, 25.5 * $scale)
$letter.CloseFigure()
$letter.StartFigure()
$letter.AddLine(14.2 * $scale, 11.6 * $scale, 14.2 * $scale, 16.7 * $scale)
$letter.AddLine(14.2 * $scale, 16.7 * $scale, 16.7 * $scale, 16.7 * $scale)
$letter.AddBezier(16.7 * $scale, 16.7 * $scale, 18.7 * $scale, 16.7 * $scale, 19.8 * $scale, 15.8 * $scale, 19.8 * $scale, 14.1 * $scale)
$letter.AddBezier(19.8 * $scale, 14.1 * $scale, 19.8 * $scale, 12.5 * $scale, 18.7 * $scale, 11.6 * $scale, 16.7 * $scale, 11.6 * $scale)
$letter.CloseFigure()
$graphics.FillPath((New-Object System.Drawing.SolidBrush($ink)), $letter)
$graphics.FillEllipse((New-Object System.Drawing.SolidBrush($accent)), 22.7 * $scale, 22.7 * $scale, 4.6 * $scale, 4.6 * $scale)

$pngPath = Join-Path $outputDirectory 'icon.png'
$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
$backgroundPath.Dispose()
$letter.Dispose()

$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$icoPath = Join-Path $outputDirectory 'icon.ico'
$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($stream)
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$pngBytes.Length)
$writer.Write([UInt32]22)
$writer.Write($pngBytes)
$writer.Flush()
[System.IO.File]::WriteAllBytes($icoPath, $stream.ToArray())
$writer.Dispose()
$stream.Dispose()

Write-Output $pngPath
Write-Output $icoPath
