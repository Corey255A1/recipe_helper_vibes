const matter = require('gray-matter');

function recipeToMarkdown(recipe) {
  const { title, ingredients, instructions, notes, ...metadata } = recipe;
  
  let headerContent = `# ${title}`;
  if (metadata.pdfPath) {
    headerContent += `\n\n[View Original PDF](${metadata.pdfPath})`;
  }

  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];
  const safeInstructions = Array.isArray(instructions) ? instructions : [];

  const content = `
${headerContent}

## Ingredients
${safeIngredients.map(ing => `- ${ing}`).join('\n')}

## Instructions
${safeInstructions.map((step, i) => `${i + 1}. ${step}`).join('\n')}

${notes ? `## Notes\n${notes}` : ''}
`.trim();

  return matter.stringify(content, {
    id: metadata.id,
    title,
    prepTime: Number(metadata.prepTime) || 0,
    cookTime: Number(metadata.cookTime) || 0,
    totalTime: Number(metadata.totalTime) || ((Number(metadata.prepTime) || 0) + (Number(metadata.cookTime) || 0)) || 20,
    servings: Number(metadata.servings) || 4,
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    source: metadata.source || '',
    favorite: Boolean(metadata.favorite),
    rating: metadata.rating || null,
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
