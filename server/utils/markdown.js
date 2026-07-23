const matter = require('gray-matter');

function recipeToMarkdown(recipe) {
  const { title, ingredients, instructions, notes, ...metadata } = recipe;
  
  let headerContent = `# ${title}`;
  if (metadata.pdfPath) {
    headerContent += `\n\n[View Original PDF](${metadata.pdfPath})`;
  }

  const content = `
${headerContent}

## Ingredients
${ingredients.map(ing => `- ${ing}`).join('\n')}

## Instructions
${instructions.map((step, i) => `${i + 1}. ${step}`).join('\n')}

${notes ? `## Notes\n${notes}` : ''}
`.trim();

  return matter.stringify(content, {
    id: metadata.id,
    title,
    prepTime: metadata.prepTime,
    cookTime: metadata.cookTime,
    totalTime: metadata.totalTime,
    servings: metadata.servings,
    tags: metadata.tags || [],
    source: metadata.source || '',
    addedAt: metadata.addedAt || new Date().toISOString(),
    timesSelected: metadata.timesSelected || 0,
    lastSelected: metadata.lastSelected || null,
    pdfPath: metadata.pdfPath || null
  });
}

function markdownToRecipe(markdownStr) {
  const { data, content } = matter(markdownStr);
  
  const ingredientsMatch = content.match(/## Ingredients\n([\s\S]*?)(?=\n##|$)/);
  const instructionsMatch = content.match(/## Instructions\n([\s\S]*?)(?=\n##|$)/);
  const notesMatch = content.match(/## Notes\n([\s\S]*?)$/);

  const ingredients = ingredientsMatch 
    ? ingredientsMatch[1].trim().split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(Boolean)
    : [];
    
  const instructions = instructionsMatch
    ? instructionsMatch[1].trim().split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
    : [];
    
  const notes = notesMatch ? notesMatch[1].trim() : '';

  return {
    ...data,
    ingredients,
    instructions,
    notes
  };
}

module.exports = {
  recipeToMarkdown,
  markdownToRecipe
};
