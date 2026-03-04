const fs = require('fs');
const path = 'src/pages/LecturerReports.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace primary holiday token
content = content.replace(/timeStr = isHoliday \? '\[CUTI\]'/g, "timeStr = isHoliday ? 'CUTI'");
content = content.replace(/time: '\[CUTI\]'/g, "time: 'CUTI'");

// Replace fallback block (more generously)
const fallbackRegex = /\/\/ 2\. Fallback: If no session, check if a class was scheduled on a holiday[\s\S]*?return \[\];/;

const newFallback = `            // 2. Fallback: If no session, check if a class was scheduled on a holiday
            const rules = timetableRules.filter(r => r.class_type === type || (type === 'Lecture' && !r.class_type));
            const holidayDatesForWeek = [];
            
            rules.forEach(rule => {
                const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const targetDayIndex = DAYS.indexOf(rule.day_of_week);

                if (targetDayIndex !== -1) {
                    const startDayIndex = weekStart.getDay();
                    const diff = (targetDayIndex - startDayIndex + 7) % 7;
                    const originalDate = new Date(weekStart);
                    originalDate.setDate(originalDate.getDate() + diff);

                    // Use ISO string without timezone shifts
                    const originalDateObj = new Date(originalDate.getTime() - (originalDate.getTimezoneOffset() * 60000));
                    const dateStrKey = originalDateObj.toISOString().split('T')[0];
                    
                    const isHoliday = holidayData.some(h => {
                         const hDate = new Date(h.date);
                         const normalizedHDate = new Date(hDate.getTime() - (hDate.getTimezoneOffset() * 60000));
                         return normalizedHDate.toISOString().split('T')[0] === dateStrKey;
                    });

                    if (isHoliday) {
                        holidayDatesForWeek.push({
                            date: \`\${originalDate.getDate()}/\${originalDate.getMonth() + 1}\`,
                            time: 'CUTI',
                            isHoliday: true,
                            fullDate: originalDate.toISOString()
                        });
                    }
                }
            });

            if (holidayDatesForWeek.length > 0) {
                return holidayDatesForWeek;
            }

            return [];`;

content = content.replace(fallbackRegex, newFallback);
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed holidays.');
