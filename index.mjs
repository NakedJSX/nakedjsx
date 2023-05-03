#!/usr/bin/env node

//
// npx is a bit weird.
//
// running 'npx nakedjsx' seems to invoke the 'nakedjsx' bin within the @nakedjsx/core dep.
// UNLESS you specify a version or tag, e.g. 'npx nakedjsx@latest' in which case this script 
// will be invoked.
//
// Anyway, reign in the chaos by forwarding invocations of this script through to @nakedjsx/core.
//

// This import is a self-executing bin script like this one, just need to import it.
import '@nakedjsx/core/cli-bin'
