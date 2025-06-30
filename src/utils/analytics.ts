export interface AnalyticsResult {
  type: 'statistics' | 'ranking' | 'comparison' | 'summary';
  title: string;
  data: any;
  formatted: string;
}

export function detectAnalyticsQuery(query: string): string | null {
  const analyticsPatterns = {
    'average_time': [
      'среднее время', 'средние часы', 'средняя продолжительность',
      'посчитай среднее', 'вычисли среднее', 'средние трудозатраты'
    ],
    'max_time': [
      'больше всех', 'максимальное время', 'самое большое время',
      'кто работал больше', 'наибольшие трудозатраты', 'топ по времени'
    ],
    'min_time': [
      'меньше всех', 'минимальное время', 'самое маленькое время',
      'кто работал меньше', 'наименьшие трудозатраты'
    ],
    'total_time': [
      'общее время', 'суммарное время', 'всего часов',
      'итого времени', 'общие трудозатраты'
    ],
    'user_ranking': [
      'рейтинг сотрудников', 'топ сотрудников', 'сортировка по времени',
      'кто сколько работал', 'список по времени'
    ],
    'project_stats': [
      'статистика проектов', 'время по проектам', 'проекты по времени',
      'сколько времени на проект'
    ],
    'daily_stats': [
      'статистика по дням', 'время по дням', 'ежедневная статистика'
    ]
  };

  const normalizedQuery = query.toLowerCase();
  
  for (const [type, patterns] of Object.entries(analyticsPatterns)) {
    if (patterns.some(pattern => normalizedQuery.includes(pattern))) {
      return type;
    }
  }
  
  return null;
}

export function calculateAverageTime(timeEntries: any[]): AnalyticsResult {
  if (timeEntries.length === 0) {
    return {
      type: 'statistics',
      title: 'Среднее время работы',
      data: { average: 0, count: 0 },
      formatted: '❌ Нет данных для расчета среднего времени'
    };
  }

  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.hours || entry.countOfMinutes / 60 || 0), 0);
  const average = totalHours / timeEntries.length;
  
  const userStats = new Map();
  timeEntries.forEach(entry => {
    const userName = entry.employee_name || entry.user || 'Неизвестный';
    const hours = entry.hours || entry.countOfMinutes / 60 || 0;
    
    if (!userStats.has(userName)) {
      userStats.set(userName, { totalHours: 0, count: 0 });
    }
    
    const stats = userStats.get(userName);
    stats.totalHours += hours;
    stats.count += 1;
  });

  const userAverages = Array.from(userStats.entries()).map(([name, stats]) => ({
    name,
    average: stats.totalHours / stats.count,
    totalHours: stats.totalHours,
    count: stats.count
  }));

  const formatted = `📊 <b>Статистика среднего времени работы</b>\n\n` +
    `📈 <b>Общая статистика:</b>\n` +
    `⏱️ Среднее время на запись: <b>${average.toFixed(1)} часов</b>\n` +
    `📝 Всего записей: <b>${timeEntries.length}</b>\n` +
    `🕐 Общее время: <b>${totalHours.toFixed(1)} часов</b>\n\n` +
    `👥 <b>По сотрудникам:</b>\n` +
    userAverages
      .sort((a, b) => b.average - a.average)
      .slice(0, 10)
      .map((user, index) => 
        `${index + 1}. <b>${user.name}</b>: ${user.average.toFixed(1)} ч/запись (${user.count} записей)`
      ).join('\n');

  return {
    type: 'statistics',
    title: 'Среднее время работы',
    data: { average, totalHours, count: timeEntries.length, userAverages },
    formatted
  };
}

export function findMaxTimeWorkers(timeEntries: any[]): AnalyticsResult {
  if (timeEntries.length === 0) {
    return {
      type: 'ranking',
      title: 'Сотрудники с максимальным временем',
      data: [],
      formatted: '❌ Нет данных для анализа'
    };
  }

  const userStats = new Map();
  timeEntries.forEach(entry => {
    const userName = entry.employee_name || entry.user || 'Неизвестный';
    const hours = entry.hours || entry.countOfMinutes / 60 || 0;
    
    if (!userStats.has(userName)) {
      userStats.set(userName, { totalHours: 0, count: 0, entries: [] });
    }
    
    const stats = userStats.get(userName);
    stats.totalHours += hours;
    stats.count += 1;
    stats.entries.push(entry);
  });

  const sortedUsers = Array.from(userStats.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.totalHours - a.totalHours);

  const topUser = sortedUsers[0];
  
  const formatted = `🏆 <b>Топ сотрудников по времени работы</b>\n\n` +
    `👑 <b>Лидер:</b> ${topUser.name}\n` +
    `⏱️ Общее время: <b>${topUser.totalHours.toFixed(1)} часов</b>\n` +
    `📝 Количество записей: <b>${topUser.count}</b>\n` +
    `📊 Среднее время: <b>${(topUser.totalHours / topUser.count).toFixed(1)} ч/запись</b>\n\n` +
    `📋 <b>Топ-10 сотрудников:</b>\n` +
    sortedUsers.slice(0, 10).map((user, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      return `${emoji} <b>${user.name}</b>: ${user.totalHours.toFixed(1)} ч (${user.count} записей)`;
    }).join('\n');

  return {
    type: 'ranking',
    title: 'Сотрудники с максимальным временем',
    data: sortedUsers,
    formatted
  };
}

export function calculateTotalTime(timeEntries: any[]): AnalyticsResult {
  if (timeEntries.length === 0) {
    return {
      type: 'summary',
      title: 'Общее время работы',
      data: { total: 0, count: 0 },
      formatted: '❌ Нет данных для расчета общего времени'
    };
  }

  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.hours || entry.countOfMinutes / 60 || 0), 0);
  const totalDays = Math.round(totalHours / 8 * 10) / 10;
  
  const projectStats = new Map();
  timeEntries.forEach(entry => {
    const projectName = entry.project_name || 'Неизвестный проект';
    const hours = entry.hours || entry.countOfMinutes / 60 || 0;
    
    if (!projectStats.has(projectName)) {
      projectStats.set(projectName, 0);
    }
    projectStats.set(projectName, projectStats.get(projectName) + hours);
  });

  const topProjects = Array.from(projectStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const formatted = `📊 <b>Общая статистика времени</b>\n\n` +
    `⏱️ <b>Общее время:</b> ${totalHours.toFixed(1)} часов\n` +
    `📅 <b>Рабочих дней:</b> ${totalDays} дней (по 8ч)\n` +
    `📝 <b>Всего записей:</b> ${timeEntries.length}\n` +
    `📊 <b>Среднее время записи:</b> ${(totalHours / timeEntries.length).toFixed(1)} часов\n\n` +
    `🏗️ <b>Топ проектов по времени:</b>\n` +
    topProjects.map(([project, hours], index) => 
      `${index + 1}. <b>${project}</b>: ${hours.toFixed(1)} ч`
    ).join('\n');

  return {
    type: 'summary',
    title: 'Общее время работы',
    data: { totalHours, totalDays, count: timeEntries.length, topProjects },
    formatted
  };
}

export function generateUserRanking(timeEntries: any[]): AnalyticsResult {
  if (timeEntries.length === 0) {
    return {
      type: 'ranking',
      title: 'Рейтинг сотрудников',
      data: [],
      formatted: '❌ Нет данных для составления рейтинга'
    };
  }

  const userStats = new Map();
  timeEntries.forEach(entry => {
    const userName = entry.employee_name || entry.user || 'Неизвестный';
    const hours = entry.hours || entry.countOfMinutes / 60 || 0;
    
    if (!userStats.has(userName)) {
      userStats.set(userName, { totalHours: 0, count: 0, avgHours: 0 });
    }
    
    const stats = userStats.get(userName);
    stats.totalHours += hours;
    stats.count += 1;
    stats.avgHours = stats.totalHours / stats.count;
  });

  const ranking = Array.from(userStats.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.totalHours - a.totalHours);

  const formatted = `🏆 <b>Рейтинг сотрудников по времени работы</b>\n\n` +
    ranking.map((user, index) => {
      const emoji = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
      return `${emoji} <b>${user.name}</b>\n` +
             `   ⏱️ Общее: ${user.totalHours.toFixed(1)} ч\n` +
             `   📝 Записей: ${user.count}\n` +
             `   📊 Среднее: ${user.avgHours.toFixed(1)} ч/запись\n`;
    }).join('\n');

  return {
    type: 'ranking',
    title: 'Рейтинг сотрудников',
    data: ranking,
    formatted
  };
}
