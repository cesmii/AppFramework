# TypeSupport

Extensible support for rendering UIs for different SMIP Types. See `example.js` for details.

## Implementation

### type.js

Populate type.js with details about the type your extension supports. This file is a loader -- as in, its used by the framework to find and load your resources.

## IDetailPane

TypeSupport is provided by fulfilling the IDetailPane "interface" (as best as is possible in ECMAScript). The example shows the required members.