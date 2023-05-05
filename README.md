# npx nakedjsx

`npx nakedjsx` allows users to build a NakedJSX site
without having to set up a node package for it.

It is essentially a thin invocation wrapper around
@nakedjsx/core and official plugins. If it is run
on files that belong to a project that itself depends
on @nakedjsx/core, then the build will be handled by
the project's installation of NakedJSX.

Please report any issues at the @nakedjsx/core issue tracker: https://github.com/NakedJSX/core/issues
