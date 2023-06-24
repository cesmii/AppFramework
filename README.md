# AppFramework

A simple framework for creating SMIP web apps. 
Extend by adding resources for each Profile (EquipmentType) you want to support -- see `TypeSupport\example.*` for more details. 

You'll also need to modify `config.js` to identify the type you want it to load.

SymLinking is supported (if your host supports it)

## See Also

[AppFrameworkExtensions](https://github.com/cesmii/AppFrameworkExtensions)

## Updates

This framework is evolving, you will want to periodically `git pull` for new changes. There's no guarantee that changes won't break extension in the future.

## Customization

You can make the framework have a unique identity without breaking the ability to `pull` changes in a few ways:

- Add your own logos and styles: your config.js file can point to a logo and css file to use. If you call them custom.png and custom.css they will be ignored via `.gitignore`

- Modify the PWA through the manifest and `icons/` folder. Once you change these, you can tell git to ignore those changes:

`git update-index --assume-unchanged manifest.json`

Repeat for each icon you change.
If you want to revert back to the CESMII defaults:

`git update-index --no-assume-unchanged manifest.json`

## Credits

- [ChartsJS](https://github.com/chartjs/Chart.js), used under a MIT license.
- [GauageJS](https://bernii.github.io/gauge.js), used under a MIT license.
