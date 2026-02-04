# -*- coding: utf-8 -*-
import re

PIXEL_ID = "BP-3tCUcClIw7-48"
POS_KEY = "35438090-4759-458a-888b-455359c13d68"

BARION_PIXEL_SCRIPT = f'''
    <!-- Barion Pixel -->
    <script>
    (function(i,s,o,g,r,a,m){{i['BarionAnalyticsObject']=r;i[r]=i[r]||function(){{
    (i[r].q=i[r].q||[]).push(arguments)}},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    }})(window,document,'script','https://pixel.barion.com/bp.js','bp');
    bp('init', 'pixelId', '{PIXEL_ID}');
    bp('track', 'pageView');
    </script>
    <noscript>
        <img height="1" width="1" style="display:none" src="https://pixel.barion.com/a.gif?ba_pixel_id='{PIXEL_ID}'&ev=pageView&noscript=1">
    </noscript>
'''

# Files to add Barion Pixel
files_to_update = ['index.html', 'auth.html', 'payment.html', 'app.html', 'aszf.html', 'adatvedelem.html']

for filename in files_to_update:
    print(f"Updating {filename}...")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if Barion Pixel already exists
        if 'barion.com/bp.js' not in content:
            # Add Barion Pixel before </head>
            content = content.replace('</head>', BARION_PIXEL_SCRIPT + '</head>')
            print(f"  - Added Barion Pixel")
        else:
            print(f"  - Barion Pixel already exists")
        
        # Update POSKey in payment.html
        if filename == 'payment.html':
            # Replace placeholder POSKey with real one
            content = re.sub(
                r'POSKey:\s*["\'][^"\']*["\']',
                f"POSKey: '{POS_KEY}'",
                content
            )
            print(f"  - Updated POSKey")
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"  - Saved!")
    except Exception as e:
        print(f"  - Error: {e}")

print("\nDone! All files updated with Barion Pixel and POSKey.")
