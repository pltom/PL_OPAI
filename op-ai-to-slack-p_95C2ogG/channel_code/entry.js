export default defineComponent({
  async run({ steps, $ }) {
    
    const data = steps.trigger.event.body || {};
    
    function getScorePercentage(score, maxScore = 100) {
      const numericScore = Number(score);
      const numericMax = Number(maxScore);

      if (!Number.isFinite(numericScore) || !Number.isFinite(numericMax) || numericMax <= 0) {
        return 0;
      }

      return (numericScore / numericMax) * 100;
    }

    function getScoreEmoji(score, maxScore = 100) {
      const percentage = getScorePercentage(score, maxScore);

      if (percentage >= 80) return "🟢";
      if (percentage >= 70) return "🟡";
      if (percentage >= 60) return "🟠";
      return "🔴";
    }

    function getPerformanceColor(score, maxScore = 100) {
      const percentage = getScorePercentage(score, maxScore);

      if (percentage >= 80) return "good";
      if (percentage >= 70) return "warning";
      if (percentage >= 60) return "#ff9900";
      return "danger";
    }

    function formatMetric(scoreField, maxField, fallbackMax = 10) {
      const score = Number(data[scoreField] ?? 0);
      const maxScore = Number(data[maxField] ?? fallbackMax);

      return `${score}/${maxScore} ${getScoreEmoji(score, maxScore)}`;
    }
    
    function extractEvaluationDetails(evaluation) {
      const details = {
        overallScore: '',
        finalVerdict: '',
        talkingRatio: '',
        topTactics: [],
        topErrors: [],
        nextSteps: [],
        structuredReflection: {},
        strategyChecklist: [],
        prospectTakeaways: {},
        missedOpportunities: [],
        finalLearning: ''
      };
      
      const scoreMatch = evaluation.match(/OVERALL (?:SALES|LEAD MANAGER) CALL SCORE: (\d+)\/100/i);
      if (scoreMatch) {
        details.overallScore = scoreMatch[1];
      }
      
      const verdictMatch = evaluation.match(/FINAL VERDICT:\s*(.*?)(?=\n\n|TALKING RATIO:|$)/s);
      if (verdictMatch) {
        details.finalVerdict = verdictMatch[1].trim();
      }
      
      const ratioMatch = evaluation.match(/TALKING RATIO:\s*(.*)/);
      if (ratioMatch) {
        details.talkingRatio = ratioMatch[1].trim();
      }
      
      const tacticsMatch = evaluation.match(/### Top 3 Key Tactics Observed\s*((?:- .*\n?){1,3})/);
      if (tacticsMatch) {
        details.topTactics = tacticsMatch[1]
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => line.replace('- ', '').trim())
          .slice(0, 3);
      }
      
      const errorsMatch = evaluation.match(/### Top 3 Unforced Errors Observed\s*((?:- .*\n?){1,3})/);
      if (errorsMatch) {
        details.topErrors = errorsMatch[1]
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => line.replace('- ', '').trim())
          .slice(0, 3);
      }
      
      const stepsMatch = evaluation.match(/### 3 Tactical Next Steps\s*((?:\d+\. .*\n?){1,3})/);
      if (stepsMatch) {
        details.nextSteps = stepsMatch[1]
          .split('\n')
          .filter(line => line.trim().match(/^\d+\./))
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .slice(0, 3);
      }
      
      const reflectionMatch = evaluation.match(/\*\*Evaluation \(Structured Reflection on Rep's Performance\)\*\*\s*(.*?)(?=\*\*Strategy Checklist|$)/s);
      if (reflectionMatch) {
        const reflection = reflectionMatch[1];
        details.structuredReflection = {
          didWell: reflection.match(/- What they did well: (.*?)(?=\n- |$)/s)?.[1]?.trim() || '',
          minorImprovements: reflection.match(/- Minor improvements they could make.*?: (.*?)(?=\n- |$)/s)?.[1]?.trim() || '',
          majorMistakes: reflection.match(/- Major mistakes they made.*?: (.*?)(?=\n- |$)/s)?.[1]?.trim() || '',
          lostConnection: reflection.match(/- Points where they lost.*?: (.*?)(?=\n|$)/s)?.[1]?.trim() || ''
        };
      }
      
      const checklistMatch = evaluation.match(/\*\*Strategy Checklist \(Pass\/Fail\)\*\*\s*(.*?)(?=\*\*Top 3|$)/s);
      if (checklistMatch) {
        const checklist = checklistMatch[1];
        const items = checklist.split('\n').filter(line => line.includes('–')).slice(0, 10);
        details.strategyChecklist = items.map(item => {
          const passed = item.includes('☑');
          const name = item.replace(/[–☑☐]/g, '').trim();
          return { name, passed };
        });
      }
      
      const takeawaysMatch = evaluation.match(/\*\*Prospect Takeaways\*\*\s*(.*?)(?=\*\*3 Missed|$)/s);
      if (takeawaysMatch) {
        const takeaways = takeawaysMatch[1];
        details.prospectTakeaways = {
          coreProblem: takeaways.match(/- Core problem: (.*?)(?=\n- |$)/s)?.[1]?.trim() || '',
          motivation: takeaways.match(/- Motivation: (.*?)(?=\n- |$)/s)?.[1]?.trim() || '',
          emotions: takeaways.match(/- Emotions: (.*?)(?=\n- |$)/s)?.[1]?.trim() || '',
          timeline: takeaways.match(/- Timeline: (.*?)(?=\n|$)/s)?.[1]?.trim() || ''
        };
      }
      
      const missedMatch = evaluation.match(/\*\*3 Missed Opportunities\*\*\s*((?:\d+\. .*\n?){1,3})/);
      if (missedMatch) {
        details.missedOpportunities = missedMatch[1]
          .split('\n')
          .filter(line => line.trim().match(/^\d+\./))
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .slice(0, 3);
      }
      
      const learningMatch = evaluation.match(/\*\*Final Learning\*\*\s*(.*?)(?=\n\n|$)/s);
      if (learningMatch) {
        details.finalLearning = learningMatch[1].trim();
      }
      
      return details;
    }
    
    let salesperson = 'Unknown';
    if (data.salesperson) {
      salesperson = data.salesperson;
    } else {
      const salespersonMatch = data.evaluation?.match(/Salesperson:\s*([^\n]+)/);
      if (salespersonMatch && salespersonMatch[1].trim() !== 'N/A' && salespersonMatch[1].trim() !== '[Not Specified]') {
        salesperson = salespersonMatch[1].trim();
      } else {
        salesperson = 'More info on OP AI link';
      }
    }

    let prospect = 'Unknown';
    if (data.prospect) {
      prospect = data.prospect;
    } else {
      const prospectMatch = data.evaluation?.match(/Prospect:\s*([^\n]+)/);
      if (prospectMatch && prospectMatch[1].trim() !== 'N/A' && prospectMatch[1].trim() !== '[Not Specified]') {
        prospect = prospectMatch[1].trim();
      }
    }
    
    const evalDetails = data.evaluation ? extractEvaluationDetails(data.evaluation) : {};
    
    const finalScore = evalDetails.overallScore || data.call_score || 0;
    const finalScoreNumber = Number(finalScore) || 0;
    const scoreEmoji = getScoreEmoji(finalScoreNumber, 100);
    
    const slackMessage = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${scoreEmoji} Sales Call Evaluation Results`
          }
        },
        
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Salesperson:*\n${salesperson}`
            },
            {
              type: "mrkdwn", 
              text: `*Prospect:*\n${prospect}`
            },
            {
              type: "mrkdwn",
              text: `*Overall Score:*\n${finalScore}/100 ${scoreEmoji}`
            },
            {
              type: "mrkdwn",
              text: `*Source:*\n${data.source || 'Unknown'}`
            }
          ]
        },
        
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.talkingRatio ? `*🗣️ Talking Ratio:* ${evalDetails.talkingRatio}` : `*🗣️ Talking Ratio:* N/A`
          }
        },
        
        {
          type: "divider"
        },
        
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*📊 Performance Breakdown*"
          }
        },

        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Opening & Control:* ${formatMetric("opening", "opening_max")}`
            },
            {
              type: "mrkdwn", 
              text: `*Empathy & Curiosity:* ${formatMetric("empathy", "empathy_max")}`
            },
            {
              type: "mrkdwn",
              text: `*Engagement:* ${formatMetric("engagement", "engagement_max")}`
            },
            {
              type: "mrkdwn",
              text: `*Assertiveness:* ${formatMetric("assertiveness", "assertiveness_max")}`
            },
            {
              type: "mrkdwn",
              text: `*Non-Neediness:* ${formatMetric("non_neediness", "non_neediness_max")}`
            },
            {
              type: "mrkdwn",
              text: `*Closing:* ${formatMetric("closing", "closing_max")}`
            }
          ]
        },
        
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Guiding Prospect:* ${formatMetric("guiding", "guiding_max")}`
            },
            {
              type: "mrkdwn", 
              text: `*Objection Handling:* ${formatMetric("objection", "objection_max")}`
            },
            {
              type: "mrkdwn",
              text: `*Storytelling:* ${formatMetric("stories", "stories_max")}`
            },
            {
              type: "mrkdwn",
              text: `*Preventing Remorse:* ${formatMetric("remorse", "remorse_max")}`
            }
          ]
        },
        
        {
          type: "divider"
        },
        
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.finalVerdict ? `*🎯 Final Verdict*\n${evalDetails.finalVerdict}` : `*🎯 Final Verdict*\nN/A`
          }
        },
        
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.strategyChecklist.length > 0
              ? `*📊 Strategy Checklist*\n${evalDetails.strategyChecklist.map(item => `${item.passed ? '✅' : '❌'} ${item.name}`).join('\n')}`
              : `*📊 Strategy Checklist*\nN/A`
          }
        },
        
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*👤 Prospect Insights*"
          }
        },
        
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Problem:*\n${evalDetails.prospectTakeaways?.coreProblem || 'N/A'}`
            },
            {
              type: "mrkdwn",
              text: `*Motivation:*\n${evalDetails.prospectTakeaways?.motivation || 'N/A'}`
            },
            {
              type: "mrkdwn", 
              text: `*Emotions:*\n${evalDetails.prospectTakeaways?.emotions || 'N/A'}`
            },
            {
              type: "mrkdwn",
              text: `*Timeline:*\n${evalDetails.prospectTakeaways?.timeline || 'N/A'}`
            }
          ]
        },
        
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.missedOpportunities.length > 0
              ? `*💡 Missed Opportunities*\n${evalDetails.missedOpportunities.map((opp, index) => `${index + 1}. ${opp}`).join('\n')}`
              : `*💡 Missed Opportunities*\nN/A`
          }
        },
        
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.finalLearning ? `*🎓 Final Learning*\n${evalDetails.finalLearning}` : `*🎓 Final Learning*\nN/A`
          }
        },
        
        {
          type: "divider"
        },
        
        {
          type: "actions",
          elements: [
            ...(data.link ? [{
              type: "button",
              text: {
                type: "plain_text",
                text: "📱 View Full Evaluation"
              },
              url: data.link,
              style: "primary"
            }] : []),
            ...(data.call_id ? [{
              type: "button",
              text: {
                type: "plain_text", 
                text: "🎧 Listen to Recording"
              },
              url: data.call_id
            }] : [])
          ]
        }
      ],
      
      text: `Sales call evaluation: ${salesperson} scored ${finalScore}/100`,
      
      attachments: [{
        color: getPerformanceColor(finalScoreNumber, 100),
        text: " "
      }]
    };
    
    return slackMessage;
  },
})