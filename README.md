# AppFramework

A simple framework for creating SMIP web apps. 
Extend by adding resources for each Profile (EquipmentType) you want to support to the TypeSupport folder -- see `TypeSupport\example.*` for more details. 

Once you've added your TypeSupport sub-folder, activate the type by modifying `types.js`, then modify `config.js` to load the `machineTypes` you want to display in a given instance of this AppFramework.

SymLinking is supported (if your host supports it)

## See Also

[AppFrameworkExtensions](https://github.com/cesmii/AppFrameworkExtensions)

## Installation

### Server-side

This framework is pure Javascript, so any web server can host it, there are no special requirements.

### Client-side

Any modern web browser should be able to render the framework -- its up to extension developers to ensure that remains true.

Most PCs and smart phones can also "install" this website as a PWA (Progressive Web App). Look for the "Install" or "Add to Home Screen" options in your OS.

## Updates

This framework is evolving, you will want to periodically `git pull` for new changes.

CESMII provides no guarantee that changes won't break extensions in the future. A [changelog](#changelog) will be published in this README.

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

## Changelog

- 6/23/2023 - Initial availability