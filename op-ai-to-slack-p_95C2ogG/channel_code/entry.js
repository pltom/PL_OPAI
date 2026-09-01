export default defineComponent({
  async run({ steps, $ }) {
    const data = steps.trigger.event.body || {};
    const evaluation = typeof data.evaluation === "string" ? data.evaluation : "";

    function getNumber(value, fallback = 0) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function getScorePercentage(score, maxScore = 100) {
      const numericScore = getNumber(score);
      const numericMax = getNumber(maxScore);

      if (numericMax <= 0) return 0;
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
      const score = getNumber(data[scoreField], 0);
      const maxScore = getNumber(data[maxField], fallbackMax);
      return `${score}/${maxScore} ${getScoreEmoji(score, maxScore)}`;
    }

    function cleanHeading(line) {
      return line.replace(/\*/g, "").trim().replace(/:$/, "").trim();
    }

    function extractSection(text, heading, nextHeadings = []) {
      const lines = text.split(/\r?\n/);
      const target = heading.toLowerCase();
      const startIndex = lines.findIndex(line => cleanHeading(line).toLowerCase().startsWith(target));

      if (startIndex < 0) return "";

      let endIndex = lines.length;
      for (let index = startIndex + 1; index < lines.length; index++) {
        const currentHeading = cleanHeading(lines[index]).toLowerCase();
        if (nextHeadings.some(nextHeading => currentHeading.startsWith(nextHeading.toLowerCase()))) {
          endIndex = index;
          break;
        }
      }

      return lines.slice(startIndex + 1, endIndex).join("\n").split("\n```")[0].trim();
    }

    function getListItems(section, limit = 3) {
      return section
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => /^(?:[-•]|\d+\.)\s+/.test(line))
        .map(line => line.replace(/^(?:[-•]|\d+\.)\s+/, "").trim())
        .slice(0, limit);
    }

    function getLineValue(section, labels) {
      const lines = section.split(/\r?\n/);

      for (const line of lines) {
        const cleanedLine = line.replace(/^(?:[-•]|\d+\.)\s+/, "").trim();
        const colonIndex = cleanedLine.indexOf(":");

        if (colonIndex < 0) continue;

        const label = cleanedLine.slice(0, colonIndex).trim().toLowerCase();
        const value = cleanedLine.slice(colonIndex + 1).trim();

        if (labels.some(expectedLabel => label === expectedLabel.toLowerCase())) {
          return value;
        }
      }

      return "";
    }

    function truncate(value, maxLength) {
      const text = String(value || "").trim();
      if (text.length <= maxLength) return text;
      return `${text.slice(0, maxLength - 1).trim()}…`;
    }

    function extractEvaluationDetails(text) {
      const details = {
        overallScore: "",
        finalVerdict: "",
        talkingRatio: "",
        strategyChecklist: [],
        prospectTakeaways: {},
        missedOpportunities: [],
        finalLearning: "",
        structuredReflection: {}
      };

      if (!text) return details;

      const scoreLine = text
        .split(/\r?\n/)
        .find(line => /OVERALL .*CALL SCORE/i.test(line));
      const scoreMatch = scoreLine?.match(/(\d+(?:\.\d+)?)\s*\/\s*100/);
      if (scoreMatch) details.overallScore = scoreMatch[1];

      details.finalVerdict = extractSection(text, "FINAL VERDICT", [
        "TALKING RATIO",
        "CALL READBACK"
      ]);

      details.talkingRatio = extractSection(text, "TALKING RATIO", [
        "CALL READBACK",
        "PRESENCE CHECKS"
      ]);

      const checklistSection = extractSection(text, "STRATEGY CHECKLIST (PASS/FAIL)", [
        "TOP 3 KEY TACTICS OBSERVED"
      ]);

      details.strategyChecklist = checklistSection
        .split(/\r?\n/)
        .map(line => line.trim())
        .map(line => line.match(/^(?:[-•]\s*)?(.+?)\s+(?:-|–|:)\s*(Pass|Fail)\s*$/i))
        .filter(Boolean)
        .map(match => ({
          name: match[1].trim(),
          passed: match[2].toLowerCase() === "pass"
        }))
        .slice(0, 10);

      const takeawaysSection = extractSection(text, "PROSPECT TAKEAWAYS", [
        "3 MISSED OPPORTUNITIES"
      ]);

      details.prospectTakeaways = {
        coreProblem: getLineValue(takeawaysSection, ["Core situation/problem", "Core problem"]),
        motivation: getLineValue(takeawaysSection, ["Motivation"]),
        emotions: getLineValue(takeawaysSection, ["Emotions"]),
        timeline: getLineValue(takeawaysSection, ["Timeline"])
      };

      const missedSection = extractSection(text, "3 MISSED OPPORTUNITIES", [
        "3 TACTICAL NEXT STEPS",
        "FINAL LEARNING"
      ]);
      details.missedOpportunities = getListItems(missedSection);

      details.finalLearning = extractSection(text, "FINAL LEARNING");

      const reflectionSection = extractSection(text, "EVALUATION - STRUCTURED REFLECTION ON REP PERFORMANCE", [
        "STRATEGY CHECKLIST"
      ]);

      details.structuredReflection = {
        didWell: getLineValue(reflectionSection, ["What they did well"]),
        minorImprovements: getLineValue(reflectionSection, ["Minor improvements they could make"]),
        majorMistakes: getLineValue(reflectionSection, ["Major mistakes they made"]),
        lostConnection: getLineValue(reflectionSection, ["Points where they lost emotional clarity or connection"])
      };

      return details;
    }

    let salesperson = data.salesperson || "Unknown";
    if (!data.salesperson) {
      const salespersonMatch = evaluation.match(/(?:Salesperson|Lead Manager):\s*([^\n,]+)/i);
      if (salespersonMatch && !/^(N\/A|\[Not Specified\])$/i.test(salespersonMatch[1].trim())) {
        salesperson = salespersonMatch[1].trim();
      } else {
        salesperson = "More info on OP AI link";
      }
    }

    let prospect = data.prospect || "Unknown";
    if (!data.prospect) {
      const prospectMatch = evaluation.match(/Prospect:\s*([^\n]+)/i);
      if (prospectMatch && !/^(N\/A|\[Not Specified\])$/i.test(prospectMatch[1].trim())) {
        prospect = prospectMatch[1].trim();
      }
    }

    const evalDetails = extractEvaluationDetails(evaluation);
    const finalScore = getNumber(evalDetails.overallScore || data.call_score, 0);
    const scoreEmoji = getScoreEmoji(finalScore, 100);
    const prospectTakeaways = evalDetails.prospectTakeaways || {};

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
              text: `*Source:*\n${data.source || "Unknown"}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.talkingRatio
              ? `*🗣️ Talking Ratio:* ${truncate(evalDetails.talkingRatio, 120)}`
              : "*🗣️ Talking Ratio:* N/A"
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
            text: evalDetails.finalVerdict
              ? `*🎯 Final Verdict*\n${truncate(evalDetails.finalVerdict, 900)}`
              : "*🎯 Final Verdict*\nN/A"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.strategyChecklist.length > 0
              ? `*📊 Strategy Checklist*\n${evalDetails.strategyChecklist.map(item => `${item.passed ? "✅" : "❌"} ${item.name}`).join("\n")}`
              : "*📊 Strategy Checklist*\nN/A"
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
              text: `*Problem:*\n${truncate(prospectTakeaways.coreProblem || "N/A", 260)}`
            },
            {
              type: "mrkdwn",
              text: `*Motivation:*\n${truncate(prospectTakeaways.motivation || "N/A", 260)}`
            },
            {
              type: "mrkdwn",
              text: `*Emotions:*\n${truncate(prospectTakeaways.emotions || "N/A", 260)}`
            },
            {
              type: "mrkdwn",
              text: `*Timeline:*\n${truncate(prospectTakeaways.timeline || "N/A", 260)}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.missedOpportunities.length > 0
              ? `*💡 Missed Opportunities*\n${evalDetails.missedOpportunities
                  .map((opportunity, index) => `${index + 1}. ${truncate(opportunity, 350)}`)
                  .join("\n")}`
              : "*💡 Missed Opportunities*\nN/A"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: evalDetails.finalLearning
              ? `*🎓 Final Learning*\n${truncate(evalDetails.finalLearning, 500)}`
              : "*🎓 Final Learning*\nN/A"
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
        color: getPerformanceColor(finalScore, 100),
        text: " "
      }]
    };

    return slackMessage;
  }
});