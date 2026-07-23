const fs = require('fs').promises;
const config = require('../config');

class HistoryService {
  async getHistory() {
    try {
      const data = await fs.readFile(config.dataPaths.history, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return { weeks: [] };
      throw error;
    }
  }

  async saveHistory(historyData) {
    await fs.writeFile(config.dataPaths.history, JSON.stringify(historyData, null, 2));
  }

  async appendToCompleteHistory(weekData) {
    let completeHistory = { weeks: [] };
    try {
      const data = await fs.readFile(config.dataPaths.completeHistory, 'utf-8');
      completeHistory = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    
    completeHistory.weeks.push(weekData);
    await fs.writeFile(config.dataPaths.completeHistory, JSON.stringify(completeHistory, null, 2));
  }

  async addWeek(weekData) {
    const history = await this.getHistory();
    history.weeks.push(weekData);

    // Keep active history capped at 6 weeks; send 7th+ oldest week to complete_history.json
    while (history.weeks.length > 6) {
      const oldestWeek = history.weeks.shift();
      await this.appendToCompleteHistory(oldestWeek);
    }

    await this.saveHistory(history);
  }
}

module.exports = new HistoryService();
