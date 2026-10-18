const Utils = {
  sortRecipes(recipes, sortMode) {
    recipes.sort((a, b) => {
      if (sortMode === 'favorites') {
        if (Boolean(b.favorite) !== Boolean(a.favorite)) {
          return b.favorite ? 1 : -1;
        }
        return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
      } else if (sortMode === 'quickest') {
        const timeA = a.totalTime || ((a.prepTime || 0) + (a.cookTime || 0)) || 20;
        const timeB = b.totalTime || ((b.prepTime || 0) + (b.cookTime || 0)) || 20;
        return timeA - timeB;
      } else if (sortMode === 'recent') {
        return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
      } else if (sortMode === 'oldest') {
        return new Date(a.addedAt || 0) - new Date(b.addedAt || 0);
      } else if (sortMode === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });
  },

  updateViewModeButtons(mode, gridBtnId, listBtnId) {
    const btnGrid = document.getElementById(gridBtnId);
    const btnList = document.getElementById(listBtnId);
    if (btnGrid && btnList) {
      if (mode === 'grid') {
        btnGrid.className = 'btn';
        btnList.className = 'btn btn-outline';
      } else {
        btnGrid.className = 'btn btn-outline';
        btnList.className = 'btn';
      }
    }
  },

  getDayDate(weekOfStr, dayIndex) {
    if (!weekOfStr) return '';
    try {
      const startDate = new Date(weekOfStr + 'T00:00:00');
      const dayDate = new Date(startDate.getTime() + dayIndex * 24 * 60 * 60 * 1000);
      return dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  },

  getPlanDays(plan) {
    if (!plan) return [];
    const startDateStr = plan.startDate || plan.weekOf;
    const daysCount = parseInt(plan.daysCount, 10) || 7;
    const days = [];
    
    let start;
    if (startDateStr) {
      const parts = startDateStr.split('-');
      if (parts.length === 3) {
        start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        start = new Date(startDateStr);
      }
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < daysCount; i++) {
      const current = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayName = dayNames[current.getDay()];
      const dayShort = shortDays[current.getDay()];
      const monthShort = monthNames[current.getMonth()];
      const dayNum = current.getDate();
      
      days.push({
        index: i,
        dateStr,
        dayName,
        dayShort,
        monthShort,
        dayNum,
        displayDate: `${monthShort} ${dayNum}`,
        fullLabel: `${dayName}, ${monthShort} ${dayNum}`
      });
    }

    return days;
  },

  formatPlanRange(plan) {
    if (!plan) return '';
    const days = this.getPlanDays(plan);
    if (!days.length) return '';
    const first = days[0];
    const last = days[days.length - 1];
    const count = days.length;
    if (count === 1) {
      return `${first.fullLabel} (1 day)`;
    }
    return `${first.monthShort} ${first.dayNum} – ${last.monthShort} ${last.dayNum} (${count} days)`;
  },

  isMealOnDay(meal, dayObj) {
    if (!meal || !meal.assignedDays || !Array.isArray(meal.assignedDays)) return false;
    return meal.assignedDays.some(d => d === dayObj.dateStr || d === dayObj.dayName);
  },

  // Scales leading quantities in an ingredient string by a multiplier
  scaleIngredient(text, multiplier) {
    if (!text || multiplier === 1) return text;

    const fractionMap = {
      '¼': 0.25, '½': 0.5, '¾': 0.75,
      '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
    };

    const formatNumber = (num) => {
      if (num <= 0) return '0';
      const whole = Math.floor(num + 0.01);
      const rem = num - whole;
      const fracCandidates = [
        { val: 0, str: '' },
        { val: 0.125, str: '⅛' },
        { val: 0.25, str: '¼' },
        { val: 1 / 3, str: '⅓' },
        { val: 0.5, str: '½' },
        { val: 2 / 3, str: '⅔' },
        { val: 0.75, str: '¾' },
        { val: 1, str: '' }
      ];
      let closest = fracCandidates[0];
      let minDiff = Math.abs(rem - closest.val);
      for (const c of fracCandidates) {
        const diff = Math.abs(rem - c.val);
        if (diff < minDiff) {
          minDiff = diff;
          closest = c;
        }
      }
      if (minDiff <= 0.06) {
        if (closest.val === 1) return String(whole + 1);
        if (whole === 0 && closest.str) return closest.str;
        return closest.str ? `${whole} ${closest.str}` : String(whole);
      }
      return Number(num.toFixed(1)).toString();
    };

    // Match leading numbers, fractions (1/2, 1 1/2), or unicode fractions (½, 1 ½)
    return text.replace(/^(\s*)(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?\s*[¼½¾⅓⅔⅛⅜⅝⅞]|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])/, (match, space, qtyStr) => {
      let val = 0;
      const trimmed = qtyStr.trim();
      if (fractionMap[trimmed]) {
        val = fractionMap[trimmed];
      } else if (/^\d+\s*[¼½¾⅓⅔⅛⅜⅝⅞]$/.test(trimmed)) {
        const whole = parseFloat(trimmed);
        const fracChar = trimmed.slice(-1);
        val = whole + (fractionMap[fracChar] || 0);
      } else if (/^\d+\s+\d+\/\d+$/.test(trimmed)) {
        const [whole, frac] = trimmed.split(/\s+/);
        const [num, den] = frac.split('/').map(Number);
        val = Number(whole) + (den ? num / den : 0);
      } else if (/^\d+\/\d+$/.test(trimmed)) {
        const [num, den] = trimmed.split('/').map(Number);
        val = den ? num / den : 0;
      } else {
        val = parseFloat(trimmed);
      }
      if (isNaN(val) || val <= 0) return match;
      return `${space}${formatNumber(val * multiplier)}`;
    });
  },

  // Converts time expressions in instruction text into clickable timer buttons
  injectInstructionTimers(stepText, stepIdx) {
    if (!stepText) return '';
    const escaped = stepText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped.replace(/\b(\d+)(?:\s*[-–to]+\s*(\d+))?\s*(hours?|hrs?|hr|minutes?|mins?|min)\b/gi, (fullMatch, n1, n2, unit) => {
      const val = parseInt(n2 || n1, 10);
      if (!val || val <= 0) return fullMatch;
      const isHour = /^h/i.test(unit);
      const totalSeconds = isHour ? val * 3600 : val * 60;
      const label = `Step ${stepIdx + 1} (${fullMatch})`;
      return `<button type="button" class="inline-timer-chip" onclick="event.stopPropagation(); RecipeCard.startTimer(${totalSeconds}, '${label.replace(/'/g, "\\'")}')" title="Start ${fullMatch} timer">⏱️ ${fullMatch}</button>`;
    });
  },

  // Client-side image downscaling via HTML5 Canvas
  async downscaleImage(file, maxDimension = 1280, quality = 0.80) {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;
        const longest = Math.max(width, height);

        if (longest > maxDimension) {
          const ratio = maxDimension / longest;
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Canvas image downscale failed'));
          }

          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          resolve({
            blob,
            file: compressedFile,
            originalSize: file.size,
            compressedSize: blob.size,
            width,
            height
          });
        }, 'image/jpeg', quality);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image for downscaling'));
      };

      img.src = objectUrl;
    });
  },

  // Cleans and normalizes an ingredient or pantry item name for fuzzy token matching
  normalizeIngredient(str) {
    if (!str) return '';
    let text = str.toLowerCase();

    // Remove text inside parentheses (e.g. "(about 2 cups)", "(optional)")
    text = text.replace(/\([^)]*\)/g, ' ');

    // Remove leading quantities and fractions (e.g. "1 1/2", "2.5", "¼", "3-4")
    text = text.replace(/^[\s\d¼½¾⅓⅔⅛⅜⅝⅞\/.,\-–]+/g, ' ');

    // Common grocery units to strip
    const units = [
      'tablespoons', 'tablespoon', 'tbsp', 'tbs',
      'teaspoons', 'teaspoon', 'tsp',
      'cups', 'cup',
      'ounces', 'ounce', 'oz',
      'pounds', 'pound', 'lbs', 'lb',
      'grams', 'gram', 'g', 'kg',
      'milliliters', 'milliliter', 'ml', 'l', 'liters',
      'cloves', 'clove',
      'cans', 'can',
      'packages', 'package', 'pkgs', 'pkg',
      'bunches', 'bunch',
      'heads', 'head',
      'stalks', 'stalk',
      'pinches', 'pinch', 'dashes', 'dash',
      'slices', 'slice',
      'bottles', 'bottle',
      'cartons', 'carton',
      'jars', 'jar',
      'bags', 'bag',
      'containers', 'container'
    ];
    const unitRegex = new RegExp(`\\b(${units.join('|')})\\b`, 'gi');
    text = text.replace(unitRegex, ' ');

    // Common prep descriptors to strip
    const prepWords = [
      'fresh', 'dried', 'frozen', 'canned', 'raw', 'cooked',
      'chopped', 'diced', 'minced', 'sliced', 'grated', 'shredded', 'crushed',
      'peeled', 'seeded', 'trimmed', 'halved', 'quartered', 'crumbled',
      'boneless', 'skinless', 'extra-virgin', 'extra virgin',
      'large', 'medium', 'small', 'jumbo',
      'to taste', 'divided', 'optional', 'for garnish', 'warm', 'cold'
    ];
    const prepRegex = new RegExp(`\\b(${prepWords.join('|')})\\b`, 'gi');
    text = text.replace(prepRegex, ' ');

    // Remove punctuation, commas, quotes
    text = text.replace(/[,:;\-\/\*#]/g, ' ').replace(/\s+/g, ' ').trim();

    // Simple singularization for common ingredients
    const words = text.split(' ').filter(w => w.length > 1).map(w => {
      if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
      if (w.endsWith('es') && (w.endsWith('shes') || w.endsWith('ches') || w.endsWith('xes') || w.endsWith('ses'))) return w.slice(0, -2);
      if (w.endsWith('toes')) return w.slice(0, -2);
      if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('is') && !w.endsWith('us')) return w.slice(0, -1);
      return w;
    });

    return words.join(' ');
  },

  // Cross-references unchecked grocery list items against pantry inventory
  matchGroceryWithPantry(groceryCategories, pantryItems) {
    if (!Array.isArray(groceryCategories) || !Array.isArray(pantryItems) || pantryItems.length === 0) {
      return [];
    }

    const matches = [];
    const matchedGroceryItemIds = new Set();

    // Prepare normalized pantry records
    const normalizedPantry = pantryItems.map(p => ({
      raw: p,
      norm: this.normalizeIngredient(p.name),
      tokens: this.normalizeIngredient(p.name).split(' ').filter(t => t.length >= 3)
    })).filter(p => p.norm.length > 0);

    for (const cat of groceryCategories) {
      for (const item of (cat.items || [])) {
        // Skip already checked items or items explicitly ignored by user
        if (item.checked || item.pantryIgnored || matchedGroceryItemIds.has(item.id)) {
          continue;
        }

        const gNorm = this.normalizeIngredient(item.ingredient);
        if (!gNorm) continue;
        const gTokens = gNorm.split(' ').filter(t => t.length >= 3);

        // Find best pantry match
        let bestMatch = null;

        for (const p of normalizedPantry) {
          // 1. Exact core normalized match (e.g. "garlic" === "garlic", "olive oil" === "olive oil")
          if (gNorm === p.norm) {
            bestMatch = p.raw;
            break;
          }

          // 2. Full word containment: pantry item core is contained in grocery item or vice versa
          const pRegex = new RegExp(`\\b${p.norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          const gRegex = new RegExp(`\\b${gNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (pRegex.test(gNorm) || gRegex.test(p.norm)) {
            bestMatch = p.raw;
            break;
          }

          // 3. Significant multi-token intersection (e.g. "black beans", "cheddar cheese")
          if (p.tokens.length > 1 && p.tokens.every(t => gTokens.includes(t))) {
            bestMatch = p.raw;
            break;
          }
          if (gTokens.length > 1 && gTokens.every(t => p.tokens.includes(t))) {
            bestMatch = p.raw;
            break;
          }
        }

        if (bestMatch) {
          matchedGroceryItemIds.add(item.id);
          matches.push({
            groceryItem: item,
            groceryCategory: cat.name,
            pantryItem: bestMatch
          });
        }
      }
    }

    return matches;
  },

  // Exports tabular data directly to CSV file download
  exportToCsv(filename, headers, rows) {
    if (!headers || !rows) return;
    const escapeCsv = (val) => {
      const str = (val === null || val === undefined) ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Generates and copies tab-delimited text to clipboard for direct Excel/Google Sheets paste
  async copyTableAsTsv(headers, rows) {
    if (!headers || !rows) return false;
    const escapeTsv = (val) => {
      return (val === null || val === undefined) ? '' : String(val).replace(/[\t\r\n]+/g, ' ');
    };

    const tsvContent = [
      headers.map(escapeTsv).join('\t'),
      ...rows.map(row => row.map(escapeTsv).join('\t'))
    ].join('\r\n');

    try {
      await navigator.clipboard.writeText(tsvContent);
      return true;
    } catch (e) {
      return false;
    }
  }
};
