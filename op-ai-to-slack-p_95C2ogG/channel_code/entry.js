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
    
    // Extract salesperson and prospect names from evaluation text
    const salespersonMatch = data.evaluation?.match(/Salesperson:\s*([^\n]+)/);
    const prospectMatch = data.evaluation?.match(/Prospect:\s*([^\n]+)/);

    // Handle different variations in the data
    let salesperson = 'Unknown';
    if (data.salesperson_name) {
      salesperson = data.salesperson_name;
    } else if (salespersonMatch && salespersonMatch[1].trim() !== '[Not Specified]') {
      salesperson = salespersonMatch[1].trim();
    } else {
      salesperson = 'More info on OP AI link';
    }

    let prospect = 'Unknown';
    if (data.prospect_name) {
      prospect = data.prospect_name;
    } else if (prospectMatch && prospectMatch[1].trim() !== '[Not Specified]') {
      prospect = prospectMatch[1].trim();
    } else if (data.prospect) {
      prospect = data.prospect;
    }
    
    // Get evaluation details
    const evalDetails = data.evaluation ? extractEvaluationDetails(data.evaluation) : {};
    
    // Use the score from evaluation text if available, otherwise use call_score
    const finalScore = evalDetails.overallScore || data.call_score || 0;
    const scoreEmoji = getScoreEmoji(parseInt(finalScore));
    
    // Create the formatted Slack message
    const slackMessage = {
      blocks: [
        // Header
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${scoreEmoji} Sales Call Evaluation Results`
          }
        },
        
        // Main info section
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
        
        // Talking ratio if available
        ...(evalDetails.talkingRatio ? [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🗣️ Talking Ratio:* ${evalDetails.talkingRatio}`
          }
        }] : []),
        
        {
          type: "divider"
        },
        
        // Performance scores
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
        
        // Additional metrics if available
        ...(data.guiding || data.objection || data.stories || data.remorse ? [{
          type: "section",
          fields: [
            ...(data.guiding ? [{
              type: "mrkdwn",
              text: `*Guiding Prospect:* ${data.guiding}/10 ${getScoreEmoji(data.guiding, true)}`
            }] : []),
            ...(data.objection ? [{
              type: "mrkdwn", 
              text: `*Objection Handling:* ${data.objection}/10 ${getScoreEmoji(data.objection, true)}`
            }] : []),
            ...(data.stories ? [{
              type: "mrkdwn",
              text: `*Storytelling:* ${data.stories}/10 ${getScoreEmoji(data.stories, true)}`
            }] : []),
            ...(data.remorse ? [{
              type: "mrkdwn",
              text: `*Preventing Remorse:* ${data.remorse}/10 ${getScoreEmoji(data.remorse, true)}`
            }] : [])
          ]
        }] : []),
        
        // Final verdict if available
        ...(evalDetails.finalVerdict ? [
          {
            type: "divider"
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*🎯 Final Verdict*\n${evalDetails.finalVerdict}`
            }
          }
        ] : []),
        
        // Top tactics if available
        ...(evalDetails.topTactics.length > 0 ? [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*✅ Top Tactics Observed*\n${evalDetails.topTactics.map(tactic => `• ${tactic}`).join('\n')}`
          }
        }] : []),
        
        // Areas for improvement if available
        ...(evalDetails.topErrors.length > 0 ? [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🔧 Areas for Improvement*\n${evalDetails.topErrors.map(error => `• ${error}`).join('\n')}`
          }
        }] : []),
        
        // Next steps if available
        ...(evalDetails.nextSteps.length > 0 ? [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📋 Next Steps*\n${evalDetails.nextSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`
          }
        }] : []),
        
        // Structured reflection if available
        ...(evalDetails.structuredReflection?.didWell ? [
          {
            type: "divider"
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*📝 Performance Reflection*"
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*✅ What they did well:*\n${evalDetails.structuredReflection.didWell}`
              },
              {
                type: "mrkdwn",
                text: `*⚠️ Minor improvements:*\n${evalDetails.structuredReflection.minorImprovements || 'None noted'}`
              }
            ]
          },
          ...(evalDetails.structuredReflection.majorMistakes ? [{
            type: "section",
            text: {
              type: "mrkdwn", 
              text: `*🚨 Major mistakes:*\n${evalDetails.structuredReflection.majorMistakes}`
            }
          }] : [])
        ] : []),
        
        // Strategy checklist if available
        ...(evalDetails.strategyChecklist.length > 0 ? [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📊 Strategy Checklist*\n${evalDetails.strategyChecklist.map(item => `${item.passed ? '✅' : '❌'} ${item.name}`).join('\n')}`
          }
        }] : []),
        
        // Prospect takeaways if available
        ...(evalDetails.prospectTakeaways?.coreProblem ? [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*👤 Prospect Insights*"
          }
        }, {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Problem:*\n${evalDetails.prospectTakeaways.coreProblem}`
            },
            {
              type: "mrkdwn",
              text: `*Motivation:*\n${evalDetails.prospectTakeaways.motivation}`
            },
            {
              type: "mrkdwn", 
              text: `*Emotions:*\n${evalDetails.prospectTakeaways.emotions}`
            },
            {
              type: "mrkdwn",
              text: `*Timeline:*\n${evalDetails.prospectTakeaways.timeline}`
            }
          ]
        }] : []),
        
        // Missed opportunities if available
        ...(evalDetails.missedOpportunities.length > 0 ? [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*💡 Missed Opportunities*\n${evalDetails.missedOpportunities.map((opp, index) => `${index + 1}. ${opp}`).join('\n')}`
          }
        }] : []),
        
        // Final learning if available
        ...(evalDetails.finalLearning ? [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🎓 Final Learning*\n${evalDetails.finalLearning}`
          }
        }] : []),
        
        // Action buttons
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