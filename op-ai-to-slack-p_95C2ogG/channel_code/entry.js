// Pipedream Node.js Code Step
// Copy this code into a Node.js code step in your Pipedream workflow

export default defineComponent({
  async run({ steps, $ }) {
    
    // Get the webhook data from the trigger
    const data = steps.trigger.event.body;
    
    // Helper function to get emoji based on score
    function getScoreEmoji(score, isOutOfTen = false) {
      const normalizedScore = isOutOfTen ? score * 10 : score;
      if (normalizedScore >= 80) return "🟢";
      if (normalizedScore >= 70) return "🟡"; 
      if (normalizedScore >= 60) return "🟠";
      return "🔴";
    }
    
    // Helper function to get performance color
    function getPerformanceColor(score) {
      if (score >= 80) return "good";
      if (score >= 70) return "warning";
      if (score >= 60) return "#ff9900";
      return "danger";
    }
    
    // Extract evaluation details from the text
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
      
      // Extract overall score
      const scoreMatch = evaluation.match(/OVERALL SALES CALL SCORE: (\d+)\/100/);
      if (scoreMatch) {
        details.overallScore = scoreMatch[1];
      }
      
      // Extract final verdict
      const verdictMatch = evaluation.match(/FINAL VERDICT:\s*(.*?)(?=\n\n|TALKING RATIO:|$)/s);
      if (verdictMatch) {
        details.finalVerdict = verdictMatch[1].trim();
      }
      
      // Extract talking ratio
      const ratioMatch = evaluation.match(/TALKING RATIO:\s*(.*)/);
      if (ratioMatch) {
        details.talkingRatio = ratioMatch[1].trim();
      }
      
      // Extract top tactics
      const tacticsMatch = evaluation.match(/### Top 3 Key Tactics Observed\s*((?:- .*\n?){1,3})/);
      if (tacticsMatch) {
        details.topTactics = tacticsMatch[1]
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => line.replace('- ', '').trim())
          .slice(0, 3);
      }
      
      // Extract top errors
      const errorsMatch = evaluation.match(/### Top 3 Unforced Errors Observed\s*((?:- .*\n?){1,3})/);
      if (errorsMatch) {
        details.topErrors = errorsMatch[1]
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => line.replace('- ', '').trim())
          .slice(0, 3);
      }
      
      // Extract next steps
      const stepsMatch = evaluation.match(/### 3 Tactical Next Steps\s*((?:\d+\. .*\n?){1,3})/);
      if (stepsMatch) {
        details.nextSteps = stepsMatch[1]
          .split('\n')
          .filter(line => line.trim().match(/^\d+\./))
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .slice(0, 3);
      }
      
      // Extract structured reflection
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
      
      // Extract strategy checklist
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
      
      // Extract prospect takeaways
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
      
      // Extract missed opportunities
      const missedMatch = evaluation.match(/\*\*3 Missed Opportunities\*\*\s*((?:\d+\. .*\n?){1,3})/);
      if (missedMatch) {
        details.missedOpportunities = missedMatch[1]
          .split('\n')
          .filter(line => line.trim().match(/^\d+\./))
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .slice(0, 3);
      }
      
      // Extract final learning
      const learningMatch = evaluation.match(/\*\*Final Learning\*\*\s*(.*?)(?=\n\n|$)/s);
      if (learningMatch) {
        details.finalLearning = learningMatch[1].trim();
      }
      
      return details;
    }
    
    // --- FIX: Use data.salesperson and data.prospect directly from payload ---
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
    // -------------------------------------------------------------------------
    
    // Get evaluation details
    const evalDetails = data.evaluation ? extractEvaluationDetails(data.evaluation) : {};
    
    // Use the score from evaluation text if available, otherwise use call_score
    const finalScore = evalDetails.overallScore || data.call_score || 0;
    const scoreEmoji = getScoreEmoji(parseInt(finalScore));
    
    // Create the formatted Slack message
    const slackMessage = {
      blocks: [
        // Block [0] - Header
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${scoreEmoji} Sales Call Evaluation Results`
          }
        },
        
        // Block [1] - Main info section
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
        
        // Block [2] - Talking ratio (conditional, always included as empty if missing)
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.talkingRatio ? `*🗣️ Talking Ratio:* ${evalDetails.talkingRatio}` : `*🗣️ Talking Ratio:* N/A`
          }
        },
        
        // Block [3] - Divider
        {
          type: "divider"
        },
        
        // Block [4] - Performance breakdown header
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*📊 Performance Breakdown*"
          }
        },

        // Block [5] - Performance scores (6 fields)
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Opening & Control:* ${data.opening || 0}/10 ${getScoreEmoji(data.opening || 0, true)}`
            },
            {
              type: "mrkdwn", 
              text: `*Empathy & Curiosity:* ${data.empathy || 0}/10 ${getScoreEmoji(data.empathy || 0, true)}`
            },
            {
              type: "mrkdwn",
              text: `*Engagement:* ${data.engagement || 0}/10 ${getScoreEmoji(data.engagement || 0, true)}`
            },
            {
              type: "mrkdwn",
              text: `*Assertiveness:* ${data.assertiveness || 0}/10 ${getScoreEmoji(data.assertiveness || 0, true)}`
            },
            {
              type: "mrkdwn",
              text: `*Non-Neediness:* ${data.non_neediness || 0}/10 ${getScoreEmoji(data.non_neediness || 0, true)}`
            },
            {
              type: "mrkdwn",
              text: `*Closing:* ${data.closing || 0}/10 ${getScoreEmoji(data.closing || 0, true)}`
            }
          ]
        },
        
        // Block [6] - Additional metrics (guiding/objection/stories/remorse)
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Guiding Prospect:* ${data.guiding || 0}/10 ${getScoreEmoji(data.guiding || 0, true)}`
            },
            {
              type: "mrkdwn", 
              text: `*Objection Handling:* ${data.objection || 0}/10 ${getScoreEmoji(data.objection || 0, true)}`
            },
            {
              type: "mrkdwn",
              text: `*Storytelling:* ${data.stories || 0}/10 ${getScoreEmoji(data.stories || 0, true)}`
            },
            {
              type: "mrkdwn",
              text: `*Preventing Remorse:* ${data.remorse || 0}/10 ${getScoreEmoji(data.remorse || 0, true)}`
            }
          ]
        },
        
        // Block [7] - Divider
        {
          type: "divider"
        },
        
        // Block [8] - Final verdict
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.finalVerdict ? `*🎯 Final Verdict*\n${evalDetails.finalVerdict}` : `*🎯 Final Verdict*\nN/A`
          }
        },
        
        // Block [9] - Strategy checklist
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.strategyChecklist.length > 0
              ? `*📊 Strategy Checklist*\n${evalDetails.strategyChecklist.map(item => `${item.passed ? '✅' : '❌'} ${item.name}`).join('\n')}`
              : `*📊 Strategy Checklist*\nN/A`
          }
        },
        
        // Block [10] - Prospect insights header
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*👤 Prospect Insights*"
          }
        },
        
        // Block [11] - Prospect fields (4 fields)
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
        
        // Block [12] - Missed opportunities
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.missedOpportunities.length > 0
              ? `*💡 Missed Opportunities*\n${evalDetails.missedOpportunities.map((opp, index) => `${index + 1}. ${opp}`).join('\n')}`
              : `*💡 Missed Opportunities*\nN/A`
          }
        },
        
        // Block [13] - Final learning
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.finalLearning ? `*🎓 Final Learning*\n${evalDetails.finalLearning}` : `*🎓 Final Learning*\nN/A`
          }
        },
        
        // Block [14] - Divider
        {
          type: "divider"
        },
        
        // Block [15] - Action buttons
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
      
      // Fallback text for notifications
      text: `Sales call evaluation: ${salesperson} scored ${finalScore}/100`,
      
      // Color sidebar based on performance
      attachments: [{
        color: getPerformanceColor(parseInt(finalScore)),
        text: " "
      }]
    };
    
    // Return the formatted message for use in next step
    return slackMessage;
  },
})