const fs = require('fs').promises
const path = require('path')

async function removeExistingThemes(themesDir) {
  try {
    const files = await fs.readdir(themesDir)
    await Promise.all(
      files.map((file) => fs.unlink(path.join(themesDir, file))),
    )
  } catch (error) {
    // If directory doesn't exist, that's fine
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
}

async function processThemes() {
  try {
    const syntaxFiles = await fs.readdir(path.join(__dirname, '../syntax'))
    const editorFiles = await fs.readdir(path.join(__dirname, '../editor'))
    const packageJsonPath = path.join(__dirname, '../package.json')
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))

    // Clear existing keywords and themes
    packageJson.keywords = []
    const syntaxNames = new Set()
    packageJson.contributes = packageJson.contributes || {}
    packageJson.contributes.themes = []
    const themes = []

    const themesDir = path.join(__dirname, '../themes')
    await fs.mkdir(themesDir, { recursive: true })
    await removeExistingThemes(themesDir)

    // Process each editor file
    for (const editorFile of editorFiles) {
      if (!editorFile.endsWith('.json')) continue

      const editorContent = JSON.parse(
        await fs.readFile(
          path.join(__dirname, '../editor', editorFile),
          'utf8',
        ),
      )
      const editorName =
        editorContent.name || path.basename(editorFile, '.json')
      const themeContent = { ...editorContent }

      // Process each syntax file for current editor
      for (const syntaxFile of syntaxFiles) {
        if (!syntaxFile.endsWith('.json')) continue

        const syntaxContent = JSON.parse(
          await fs.readFile(
            path.join(__dirname, '../syntax', syntaxFile),
            'utf8',
          ),
        )

        if (syntaxContent.name) {
          syntaxNames.add(syntaxContent.name)
        }

        // Create new theme by merging editor and syntax
        const finalTheme = { ...themeContent }
        Object.assign(finalTheme, syntaxContent)

        // Modified theme naming pattern
        const themeName = `i3 - ${syntaxContent.name} - ${editorName}`
        finalTheme.name = themeName

        const fileName = themeName
          .replace('i3 - ', '')
          .toLowerCase()
          .replace(/\s+/g, '-')
        const themeFileName = `${fileName}.json`

        await fs.writeFile(
          path.join(themesDir, themeFileName),
          JSON.stringify(finalTheme, null, 2),
        )

        themes.push({
          label: themeName,
          uiTheme: 'vs-dark',
          path: `./themes/${themeFileName}`,
        })
      }
    }

    // Sort themes by label suffix (editor name) in descending order
    themes.sort((a, b) => {
      const suffixA = a.label.split(' - ')[2] || ''
      const suffixB = b.label.split(' - ')[2] || ''
      return suffixB.localeCompare(suffixA)
    })

    // Update package.json
    packageJson.keywords = Array.from(syntaxNames)
    packageJson.contributes.themes = themes

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
    console.log('Theme processing completed successfully!')
  } catch (error) {
    console.error('Error processing themes:', error)
  }
}

processThemes()
