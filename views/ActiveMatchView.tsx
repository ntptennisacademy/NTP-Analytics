import React from 'react';
import { MatchConfig, Player, Point, Outcome, ShotKind, ShotLocation, ErrorType, ServePlacement, ServeType, CourtSide } from '../types';
import { Card, SegmentedControl } from '../components/UI';
import { CurrentScore, calculateNewScore, calculateStats, DetailedStat, calculateShotBreakdown, getPointDescription, isWinningPointOfGame, getFinalScoreString, calculateServePlacementStats, getCourtSide, calculateServeTypeStats, calculateDetailedShotStats } from '../logic/tennisLogic';

interface ActiveMatchViewProps {
  config: MatchConfig;
  players: Player[];
  initialPoints?: Point[];
  initialNotes?: string;
  onFinish?: (points: Point[]) => void;
  onPause?: (points: Point[]) => void;
  onCancel: () => void;
  onEditSettings?: (config: MatchConfig) => void;
  onUpdateNotes?: (notes: string) => void;
  onUndo?: (points: Point[]) => void;
  isReadOnly?: boolean;
}

const ActiveMatchView: React.FC<ActiveMatchViewProps> = ({ 
  config, 
  players, 
  initialPoints = [], 
  initialNotes = "",
  onFinish, 
  onPause,
  onCancel, 
  onEditSettings,
  onUpdateNotes,
  onUndo,
  isReadOnly = false 
}) => {
  const [points, setPoints] = React.useState<Point[]>(initialPoints);
  const [notes, setNotes] = React.useState(initialNotes);
  const [isNotesOpen, setIsNotesOpen] = React.useState(false);
  const [showExportPrompt, setShowExportPrompt] = React.useState(false);
  const [exportStep, setExportStep] = React.useState<'player' | 'format'>('player');
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null);
  const [exportRound, setExportRound] = React.useState(config.round || '');
  
  const [score, setScore] = React.useState<CurrentScore>(() => {
    // Correctly initialize state with all required CurrentScore properties
    let current: CurrentScore = {
      p1Points: '0', p2Points: '0', p1Games: 0, p2Games: 0, p1Sets: 0, p2Sets: 0, setHistory: [],
      servingPlayerId: config.initialServerId, isGameOver: false, isSetOver: false, isMatchOver: false, isTieBreak: false, isSuperTieBreak: false
    };
    initialPoints.forEach(p => {
      current = calculateNewScore(current, p.winnerId, config.p1Id, config.p2Id, config);
    });
    return current;
  });

  React.useEffect(() => {
    // Correctly re-initialize state with all required CurrentScore properties when props change
    let current: CurrentScore = {
      p1Points: '0', p2Points: '0', p1Games: 0, p2Games: 0, p1Sets: 0, p2Sets: 0, setHistory: [],
      servingPlayerId: config.initialServerId, isGameOver: false, isSetOver: false, isMatchOver: false, isTieBreak: false, isSuperTieBreak: false
    };
    points.forEach(p => {
      current = calculateNewScore(current, p.winnerId, config.p1Id, config.p2Id, config);
    });
    setScore(current);
  }, [config, points]);

  const [serveNumber, setServeNumber] = React.useState<1 | 2>(1);
  const [activeSubTab, setActiveSubTab] = React.useState<'Match Stats' | 'Shot Stats' | 'Serve Analysis' | 'Match Log'>('Match Stats');
  const [pointModal, setPointModal] = React.useState<{ show: boolean; winnerId: string; loserId: string }>({ show: false, winnerId: '', loserId: '' });
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);

  const p1Found = players.find(p => p.id === config.p1Id);
  const p2Found = players.find(p => p.id === config.p2Id);

  // Synthesize players if missing from global state
  const p1: Player = p1Found || {
    id: config.p1Id,
    name: config.p1Name || 'Player 1',
    team: '',
    hittingArm: 'Right',
    backhand: 'Two-Handed',
    utrRating: 0,
    isSaved: false
  };

  const p2: Player = p2Found || {
    id: config.p2Id,
    name: config.p2Name || 'Player 2',
    team: '',
    hittingArm: 'Right',
    backhand: 'Two-Handed',
    utrRating: 0,
    isSaved: false
  };

  const [outcome, setOutcome] = React.useState<Outcome | null>(null);
  const [shotSide, setShotSide] = React.useState<'Forehand' | 'Backhand' | null>(null);
  const [shotKind, setShotKind] = React.useState<ShotKind | null>(null);
  const [location, setLocation] = React.useState<ShotLocation | null>(null);
  const [errorType, setErrorType] = React.useState<ErrorType | null>(null);
  const [servePlacement, setServePlacement] = React.useState<ServePlacement | null>(null);
  const [serveType, setServeType] = React.useState<ServeType | null>(null);
  const [preServePlacement, setPreServePlacement] = React.useState<ServePlacement | null>(null);
  const [preServeType, setPreServeType] = React.useState<ServeType | null>(null);
  const [rallyLength, setRallyLength] = React.useState<number>(0);
  const [showRallyCounter, setShowRallyCounter] = React.useState<boolean>(false);

  const [selectedSet, setSelectedSet] = React.useState<string>('Full Match');

  const setOptions = React.useMemo(() => {
    const playedSets = Array.from(
      new Set(points.map(p => p.scoreAtStart.p1Sets + p.scoreAtStart.p2Sets + 1))
    ).sort((a, b) => a - b);
    
    const options = [{ label: 'Full Match', value: 'Full Match' }];
    if (playedSets.length === 0) {
      options.push({ label: 'Set 1', value: 'Set 1' });
    } else {
      playedSets.forEach(s => {
        options.push({ label: `Set ${s}`, value: `Set ${s}` });
      });
    }
    return options;
  }, [points]);

  React.useEffect(() => {
    if (!setOptions.some(opt => opt.value === selectedSet)) {
      setSelectedSet('Full Match');
    }
  }, [setOptions, selectedSet]);

  const filteredPoints = React.useMemo(() => {
    if (selectedSet === 'Full Match') return points;
    const setNumber = parseInt(selectedSet.replace('Set ', ''), 10);
    if (isNaN(setNumber)) return points;
    return points.filter(p => p.scoreAtStart.p1Sets + p.scoreAtStart.p2Sets + 1 === setNumber);
  }, [points, selectedSet]);

  const stats = calculateStats(filteredPoints, p1.id, p2.id);

  const showDoubleFault = score.servingPlayerId === pointModal.loserId && serveNumber === 2;
  const showAce = score.servingPlayerId === pointModal.winnerId;

  const handlePointClick = (winnerId: string, loserId: string) => {
    if (isReadOnly || score.isMatchOver) return;
    
    // Carry over values logged during the point
    if (preServePlacement) setServePlacement(preServePlacement);
    if (preServeType) setServeType(preServeType);
    
    setPointModal({ show: true, winnerId, loserId });
  };

  const resetModalState = () => {
    setPointModal({ show: false, winnerId: '', loserId: '' });
    setOutcome(null);
    setShotSide(null);
    setShotKind(null);
    setLocation(null);
    setErrorType(null);
    setServePlacement(null);
    setServeType(null);
    setPreServePlacement(null);
    setPreServeType(null);
    setRallyLength(0);
    setServeNumber(1);
  };

  const handleUndo = () => {
    if (points.length === 0) return;
    const newPoints = points.slice(0, -1);
    setPoints(newPoints);
    if (onUndo) onUndo(newPoints);
  };

  const handleSavePoint = () => {
    const finalOutcome = outcome || 'Winner';
    const prelimPoint: any = {
      scoreAtStart: {
        p1Points: score.p1Points,
        p2Points: score.p2Points,
        p1Games: score.p1Games,
        p2Games: score.p2Games,
        p1Sets: score.p1Sets,
        p2Sets: score.p2Sets,
      }
    };
    const currentCourtSide = getCourtSide(prelimPoint as Point);

    const newPoint: Point = {
      winnerId: pointModal.winnerId,
      loserId: pointModal.loserId,
      outcome: finalOutcome,
      serverPlayerId: score.servingPlayerId,
      serveNumber,
      courtSide: currentCourtSide,
      serveType: serveType || undefined,
      shotSide: shotSide || undefined,
      shotKind: shotKind || undefined,
      location: location || undefined,
      errorType: errorType || undefined,
      servePlacement: servePlacement || undefined,
      rallyLength,
      scoreAtStart: prelimPoint.scoreAtStart
    };
    const newPoints = [...points, newPoint];
    setPoints(newPoints);
    resetModalState();
    if (onFinish && calculateNewScore(score, pointModal.winnerId, p1.id, p2.id, config).isMatchOver) onFinish(newPoints);
    else if (onPause) onPause(newPoints);
  };

  const generateReportHTML = (playerId: string) => {
    const subjectPlayer = playerId === p1.id ? p1 : p2;
    const opponentPlayer = playerId === p1.id ? p2 : p1;
    const subjectStats = playerId === p1.id ? stats.p1 : stats.p2;
    const finalScoreStr = getFinalScoreString(points, config);

    const getBreakdown = (type: Outcome) => calculateShotBreakdown(points, p1.id, p2.id, type);
    const filterSubject = (list: any[]) => list.map(r => ({ label: r.label, val: playerId === p1.id ? r.p1 : r.p2 }));

    const winnersSub = filterSubject(getBreakdown('Winner'));
    const forcedSub = filterSubject(getBreakdown('Forced Error'));
    const unforcedSub = filterSubject(getBreakdown('Unforced Error'));

    const renderDetailed = (s: DetailedStat) => `${s.won}/${s.total} (${s.pct.toFixed(1)}%)`;
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character]!));

    const logoSVG = `
      <svg width="340" height="60" viewBox="0 0 500 80" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="55" font-family="Arial Black, sans-serif" font-size="44" fill="#0F5CCE" font-style="italic" font-weight="900" letter-spacing="2">NEXT TENNIS PRO</text>
      </svg>
    `;

    const detailedStats = calculateDetailedShotStats(points, playerId);
    const servePlacementStats = calculateServePlacementStats(points, playerId);

    const showAdvanced = config.scoringType === 'Shot Stats';
    const showDetailedServe = showAdvanced && config.trackServe;
    const showDetailedShot = showAdvanced && config.trackShotPlacement;
    const showDetailedError = showAdvanced && config.trackErrorType;

    return `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Arial', sans-serif; color: #000000; margin: 0; padding: 20px; }
          .report-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 5px solid #000000; padding-bottom: 15px; margin-bottom: 40px; }
          .logo-container { width: 340px; }
          h1 { font-size: 24pt; font-weight: bold; text-transform: uppercase; margin: 0; padding: 0; color: #000000; text-align: right; }
          .meta-info { font-size: 14pt; margin-bottom: 40px; width: 100%; border-collapse: collapse; }
          .meta-info td { padding: 6px 0; font-weight: bold; }
          .meta-info td span { font-weight: normal; margin-left: 15px; }
          .section-title { font-size: 18pt; font-weight: bold; border-bottom: 2px solid #000000; padding-bottom: 5px; margin-bottom: 25px; text-transform: uppercase; margin-top: 40px; color: #000000; }
          .stats-grid { width: 100%; border-collapse: collapse; }
          .stats-grid td { width: 50%; vertical-align: top; padding: 0 20px 0 0; }
          .group-header { font-size: 14pt; font-weight: bold; color: #0F5CCE; border-left: 6px solid #0F5CCE; padding-left: 10px; margin: 30px 0 15px 0; }
          .stat-line { width: 100%; font-size: 11pt; border-bottom: 1px solid #eeeeee; margin-bottom: 6px; padding: 4px 0; }
          .stat-label { float: left; text-transform: uppercase; font-size: 10pt; }
          .stat-value { float: right; font-weight: bold; color: #000000; }
          .clear { clear: both; }
          .total-line { font-weight: bold; border-top: 2px solid #000000 !important; margin-top: 5px; padding-top: 5px; }
          .bar-container { background: #f0f0f0; height: 12px; border-radius: 6px; margin-top: 4px; overflow: hidden; }
          .bar-fill { background: #0F5CCE; height: 100%; }
          .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .analysis-card { background: #ffffff; border: 1px solid #eeeeee; padding: 12px; border-radius: 8px; text-align: center; }
          .analysis-val { font-size: 16pt; font-weight: black; margin: 5px 0; }
          .analysis-label { font-size: 9pt; font-weight: bold; color: #666666; text-transform: uppercase; }
          .notes-box { margin-top: 60px; border-top: 3px solid #000000; padding-top: 25px; font-size: 12pt; }
          .notes-title { font-weight: bold; text-transform: uppercase; margin-bottom: 12px; font-size: 14pt; color: #000000; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="logo-container">${logoSVG}</div>
          <h1>POST-MATCH ANALYSIS</h1>
        </div>
        
        <table class="meta-info">
          <tr><td>NAME: <span>${escapeHtml(subjectPlayer.name)}</span></td></tr>
          <tr><td>OPPONENT: <span>${escapeHtml(opponentPlayer.name)}</span></td></tr>
          <tr><td>ROUND #: <span>${escapeHtml(exportRound || 'N/A')}</span></td></tr>
          <tr><td>SCORE: <span>${escapeHtml(finalScoreStr)}</span></td></tr>
        </table>

        <div class="section-title">Match Statistics</div>

        <table class="stats-grid">
          <tr>
            <td>
              <div class="group-header">Serve Statistics</div>
              <div class="stat-line"><span class="stat-label">1st Serve %</span><span class="stat-value">${subjectStats.firstServePercentage.pct.toFixed(1)}%</span><div class="clear"></div></div>
              <div class="stat-line"><span class="stat-label">2nd Serve %</span><span class="stat-value">${subjectStats.secondServePercentage.pct.toFixed(1)}%</span><div class="clear"></div></div>
              <div class="stat-line"><span class="stat-label">Aces</span><span class="stat-value">${subjectStats.aces}</span><div class="clear"></div></div>
              <div class="stat-line"><span class="stat-label">Double Faults</span><span class="stat-value">${subjectStats.doubleFaults}</span><div class="clear"></div></div>
              <div class="stat-line"><span class="stat-label">1st Serve Pts Won</span><span class="stat-value">${renderDetailed(subjectStats.firstServePointsWon)}</span><div class="clear"></div></div>
              <div class="stat-line"><span class="stat-label">2nd Serve Pts Won</span><span class="stat-value">${renderDetailed(subjectStats.secondServePointsWon)}</span><div class="clear"></div></div>
              <div class="stat-line"><span class="stat-label">Break Points Saved</span><span class="stat-value">${renderDetailed(subjectStats.breakPointsSaved)}</span><div class="clear"></div></div>

              <div class="group-header">Return Statistics</div>
              <div class="stat-line"><span class="stat-label">1st Return Pts Won</span><span class="stat-value">${renderDetailed(subjectStats.firstReturnPointsWon)}</span><div class="clear"></div></div>
              <div class="stat-line"><span class="stat-label">2nd Return Pts Won</span><span class="stat-value">${renderDetailed(subjectStats.secondReturnPointsWon)}</span><div class="clear"></div></div>
              <div class="stat-line"><span class="stat-label">Break Points Won</span><span class="stat-value">${renderDetailed(subjectStats.breakPointsWon)}</span><div class="clear"></div></div>
            </td>
            <td>
              <div class="group-header">Winners</div>
              ${winnersSub.map(w => w.label !== 'Total' ? `
              <div class="stat-line"><span class="stat-label">${w.label}</span><span class="stat-value">${w.val}</span><div class="clear"></div></div>` : '').join('')}
              <div class="stat-line total-line"><span class="stat-label">TOTAL WINNERS</span><span class="stat-value">${winnersSub.find(w=>w.label==='Total')?.val || 0}</span><div class="clear"></div></div>

              <div class="group-header">Forced Errors</div>
              ${forcedSub.map(f => f.label !== 'Total' ? `
              <div class="stat-line"><span class="stat-label">${f.label}</span><span class="stat-value">${f.val}</span><div class="clear"></div></div>` : '').join('')}
              <div class="stat-line total-line"><span class="stat-label">TOTAL FORCED ERRORS</span><span class="stat-value">${forcedSub.find(f=>f.label==='Total')?.val || 0}</span><div class="clear"></div></div>

              <div class="group-header">Unforced Errors</div>
              ${unforcedSub.map(u => u.label !== 'Total' ? `
              <div class="stat-line"><span class="stat-label">${u.label}</span><span class="stat-value">${u.val}</span><div class="clear"></div></div>` : '').join('')}
              <div class="stat-line total-line"><span class="stat-label">TOTAL UNFORCED ERRORS</span><span class="stat-value">${unforcedSub.find(u=>u.label==='Total')?.val || 0}</span><div class="clear"></div></div>
            </td>
          </tr>
        </table>

        ${(showDetailedServe || showDetailedShot || showDetailedError) ? `
        <div class="section-title">Advanced Analysis</div>

        ${showDetailedError ? `
        <div class="group-header">Error Anatomy (Where points were lost)</div>
        <table style="width: 100%; margin-bottom: 30px;">
          <tr>
            ${Object.entries(detailedStats.errorStats).map(([label, val]) => {
              const totalErrors = Object.values(detailedStats.errorStats).reduce((a, b) => a + b, 0);
              const pct = totalErrors > 0 ? (val / totalErrors * 100) : 0;
              return `
              <td style="width: 33%; padding-right: 15px;">
                <div class="analysis-card">
                  <div class="analysis-label">${label}</div>
                  <div class="analysis-val">${val}</div>
                  <div class="bar-container"><div class="bar-fill" style="width: ${pct}%"></div></div>
                  <div style="font-size: 8pt; margin-top: 4px; font-weight: bold;">${pct.toFixed(0)}% of Errors</div>
                </div>
              </td>`;
            }).join('')}
          </tr>
        </table>` : ''}

        ${showDetailedServe ? `
        <div class="group-header">Serve Placement Distribution</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; text-align: center; border: 1px solid #eeeeee;">
          <tr style="background: #f8f8f8;">
            <th style="padding: 10px; border: 1px solid #eeeeee;">Court</th>
            <th style="padding: 10px; border: 1px solid #eeeeee;">Wide</th>
            <th style="padding: 10px; border: 1px solid #eeeeee;">Body</th>
            <th style="padding: 10px; border: 1px solid #eeeeee;">T</th>
          </tr>
          ${['Deuce', 'Ad'].map(court => `
          <tr>
            <td style="padding: 12px; border: 1px solid #eeeeee; font-weight: bold; background: #fdfdfd;">${court}</td>
            ${['Wide', 'Body', 'T'].map(p => {
              const s = servePlacementStats[court]?.[p] || { total: 0, won: 0, aces: 0 };
              const winPct = s.total > 0 ? (s.won / s.total * 100).toFixed(0) : '0';
              return `
              <td style="padding: 12px; border: 1px solid #eeeeee;">
                <div style="font-size: 14pt; font-weight: black;">${winPct}%</div>
                <div style="font-size: 7pt; color: #666; font-weight: bold;">WIN RATE</div>
                <div style="font-size: 7pt; color: #999; margin-top: 2px;">${s.aces} Aces / ${s.total} Pts</div>
              </td>`;
            }).join('')}
          </tr>`).join('')}
        </table>` : ''}

        ${showDetailedShot ? `
        <div class="group-header">Shot Placement Efficiency</div>
        <table style="width: 100%; margin-bottom: 30px;">
          <tr>
            ${Object.entries(detailedStats.placementStats).map(([label, s]) => {
              const winPct = s.total > 0 ? (s.winners / s.total * 100).toFixed(0) : '0';
              return `
              <td style="width: 33%; padding-right: 15px;">
                <div class="analysis-card">
                  <div class="analysis-label">${label}</div>
                  <div class="analysis-val">${winPct}%</div>
                  <div class="bar-container"><div class="bar-fill" style="width: ${winPct}%"></div></div>
                  <div style="font-size: 8pt; margin-top: 4px; font-weight: bold;">Winner Conversion</div>
                  <div style="font-size: 7pt; color: #999; margin-top: 2px;">${s.winners} Winners / ${s.total} Total</div>
                </div>
              </td>`;
            }).join('')}
          </tr>
        </table>` : ''}
        ` : ''}

        <div class="notes-box">
          <div class="notes-title">Match Notes</div>
          <div style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(notes || 'No specific notes recorded for this match session.')}</div>
        </div>
      </body>
      </html>
    `;
  };

  const exportMatch = (format: 'pdf' | 'doc') => {
    if (!selectedPlayerId) return;
    const html = generateReportHTML(selectedPlayerId);
    const subjectPlayer = selectedPlayerId === p1.id ? p1 : p2;

    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }
    } else {
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${subjectPlayer.name.replace(/[\\/:*?"<>|]/g, '_')}_NTP_Analysis_${new Date().getTime()}.doc`;
      link.click();
      URL.revokeObjectURL(url);
    }
    
    setShowExportPrompt(false);
    setShowMoreMenu(false);
    setSelectedPlayerId(null);
    setExportStep('player');
  };

  const handleBack = () => {
    if (!isReadOnly && !score.isMatchOver && onPause) onPause(points);
    onCancel();
  };

  const step1Outcome = outcome !== null;
  const isError = outcome === 'Unforced Error' || outcome === 'Forced Error';
  const isDoubleFault = outcome === 'Double Fault';
  const isAce = outcome === 'Ace';
  const needsSide = outcome === 'Winner' || isError;
  const step2Side = needsSide && shotSide !== null;

  const BlueBtn: React.FC<{ label: string; active: boolean; onClick: () => void; className?: string }> = ({ label, active, onClick, className = "" }) => (
    <button 
      onClick={onClick}
      className={`py-3.5 px-4 rounded-xl font-bold transition-all duration-200 border-2 text-[15px] ${
        active 
          ? 'bg-primary text-white border-primary shadow-lg ring-2 ring-primary/20' 
          : 'bg-white text-primary border-primary hover:bg-primary/5 active:scale-[0.98]'
      } ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-iosBg relative overflow-hidden">
      <button 
        onClick={() => setIsNotesOpen(true)}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-[60] bg-white shadow-xl rounded-full w-12 h-12 flex items-center justify-center text-primary border border-iosDivider/50 active:scale-90 transition-transform"
      >
        <i className="fa-solid fa-pen-to-square"></i>
      </button>

      <header className="px-4 pt-10 pb-4 flex justify-between items-center border-b border-iosDivider/20 bg-white/80 backdrop-blur-md sticky top-0 z-[70]">
        <button onClick={handleBack} className="text-primary flex items-center gap-1 font-semibold">
          <i className="fa-solid fa-chevron-left text-sm"></i> Matches
        </button>
        <div className="flex items-center gap-4 text-primary relative">
          <button onClick={handleUndo} disabled={points.length === 0} className={points.length === 0 ? 'opacity-30' : 'active:scale-90 transition-transform'}>
            <i className="fa-solid fa-rotate-left"></i>
          </button>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }} className="active:scale-90 transition-transform">
              <i className="fa-solid fa-ellipsis"></i>
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-10 w-52 bg-white border border-iosDivider rounded-xl shadow-2xl py-1 z-[80] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <button onClick={() => { setShowMoreMenu(false); onEditSettings?.(config); }} className="w-full text-left px-4 py-4 text-sm font-semibold hover:bg-iosBg flex items-center gap-3 border-b border-iosDivider/10">
                  <i className="fa-solid fa-gear text-primary opacity-60"></i> Edit Match Settings
                </button>
                <button onClick={() => { setShowExportPrompt(true); setExportStep('player'); setShowMoreMenu(false); }} className="w-full text-left px-4 py-4 text-sm font-semibold hover:bg-iosBg flex items-center gap-3">
                  <i className="fa-solid fa-file-export text-primary opacity-60"></i> Export Match
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showMoreMenu && <div className="fixed inset-0 z-[65] bg-transparent" onClick={() => setShowMoreMenu(false)} />}

      <div className="flex-1 overflow-y-auto pb-44">
        <div className="p-4">
          <Card className="p-0 border-none shadow-md overflow-hidden">
            <div className="bg-primary text-white px-4 py-2.5 text-[10px] font-bold flex justify-between uppercase tracking-widest items-center">
              <span>{new Date(config.existingMatchId ? Number(config.existingMatchId) : Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="p-4 space-y-4 bg-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-black uppercase">{p1.name[0]}</div>
                  <span className="text-sm font-bold">{p1.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {score.setHistory.map((s, idx) => <span key={idx} className="text-iosGray text-sm font-bold opacity-60">{s.p1}</span>)}
                  <span className="font-black text-xl tabular-nums">{score.p1Games}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-black uppercase">{p2.name[0]}</div>
                  <span className="text-sm font-bold">{p2.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {score.setHistory.map((s, idx) => <span key={idx} className="text-iosGray text-sm font-bold opacity-60">{s.p2}</span>)}
                  <span className="font-black text-xl tabular-nums">{score.p2Games}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="px-6 pb-6 pt-2 flex justify-between relative items-center">
          <div className="flex flex-col items-center flex-1 cursor-pointer" onClick={() => handlePointClick(p1.id, p2.id)}>
            {!score.isMatchOver && score.servingPlayerId === p1.id && <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full absolute left-4 top-2 animate-pulse"></div>}
            <span className="text-sm font-bold text-iosGray mb-1 uppercase">{p1.name[0]}</span>
            <span className="text-8xl scoreboard-font text-primary tracking-tighter tabular-nums">{score.p1Points}</span>
          </div>

          <div className="flex flex-col items-center flex-1 cursor-pointer" onClick={() => handlePointClick(p2.id, p1.id)}>
            {!score.isMatchOver && score.servingPlayerId === p2.id && <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full absolute right-4 top-2 animate-pulse"></div>}
            <span className="text-sm font-bold text-iosGray mb-1 uppercase">{p2.name[0]}</span>
            <span className="text-8xl scoreboard-font text-black tracking-tighter tabular-nums">{score.p2Points}</span>
          </div>
        </div>

        {!isReadOnly && !score.isMatchOver && (
          <div className="flex justify-center mb-4 -mt-2">
            <button
              type="button"
              onClick={() => setShowRallyCounter(!showRallyCounter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all duration-300 shadow-sm active:scale-95 ${
                showRallyCounter 
                  ? 'bg-primary text-white border-primary shadow-md' 
                  : 'bg-white text-primary border-primary/20 hover:bg-neutral-50 hover:border-primary/40'
              }`}
            >
              <i className="fa-solid fa-baseball text-[9px]"></i>
              <span>Rally Clicker</span>
            </button>
          </div>
        )}

        {!isReadOnly && !score.isMatchOver && showRallyCounter && (
          <div className="px-4 mb-5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-[#F2F2F7] border border-[#C6C6C8]/30 rounded-2xl p-2.5 shadow-sm">
              <div 
                className="bg-white hover:bg-[#EAEAEF] active:scale-[0.99] border border-[#C6C6C8]/40 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all select-none shadow-sm"
                onClick={() => setRallyLength(prev => prev + 1)}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-[11px] uppercase font-black text-primary/80 tracking-widest leading-none">Tap to Add Hit</span>
                  <span className="text-[9px] text-iosGray font-medium leading-none mt-1">Tap this entire area during a rally</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-4xl font-black tracking-tight text-primary tabular-nums leading-none">{rallyLength}</span>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <i className="fa-solid fa-baseball text-sm"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isReadOnly && !score.isMatchOver && (
          <div className="px-4 mb-6 space-y-4">
            <SegmentedControl options={[{ label: 'First Serve', value: 1 }, { label: 'Second Serve', value: 2 }]} value={serveNumber} onChange={(v: any) => setServeNumber(v)} />
            
            {config.trackServe && config.scoringType === 'Shot Stats' && (
              <div className="bg-white/50 rounded-2xl p-3 border border-iosDivider/10 animate-in fade-in slide-in-from-top-2">
                <span className="text-[9px] text-iosGray uppercase font-black mb-2 block text-center opacity-40 tracking-widest">Ongoing Serve Record</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['Wide', 'Body', 'T'] as ServePlacement[]).map(p => (
                    <button 
                      key={p} 
                      onClick={() => setPreServePlacement(preServePlacement === p ? null : p)}
                      className={`py-2 text-[11px] font-bold rounded-lg border transition-all ${
                        preServePlacement === p 
                          ? 'bg-primary text-white border-primary shadow-sm' 
                          : 'bg-white text-primary border-primary/20'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {preServePlacement && (
                   <div className="grid grid-cols-3 gap-2 mt-2 animate-in fade-in slide-in-from-top-1">
                     {(['Flat', 'Slice', 'Kick'] as ServeType[]).map(t => (
                        <button 
                          key={t} 
                          onClick={() => setPreServeType(preServeType === t ? null : t)}
                          className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                            preServeType === t 
                              ? 'bg-primary text-white border-primary shadow-sm' 
                              : 'bg-white/50 text-primary border-primary/10'
                          }`}
                        >
                          {t}
                        </button>
                     ))}
                   </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Set Selector Filter */}
        <div className="px-4 mb-5">
          <SegmentedControl 
            options={setOptions} 
            value={selectedSet} 
            onChange={(v: string) => setSelectedSet(v)} 
          />
        </div>

        <div className="px-4">
          {activeSubTab === 'Match Stats' && (
            <Card className="divide-y divide-iosDivider/10 border-none shadow-none bg-transparent">
              <StatRow label="1st serve percentage" val1={stats.p1.firstServePercentage} val2={stats.p2.firstServePercentage} isPercentOnly />
              <StatRow label="2nd serve percentage" val1={stats.p1.secondServePercentage} val2={stats.p2.secondServePercentage} isPercentOnly />
              <StatRow label="aces" val1={stats.p1.aces} val2={stats.p2.aces} />
              <StatRow label="double faults" val1={stats.p1.doubleFaults} val2={stats.p2.doubleFaults} />
              <StatRow label="winners" val1={stats.p1.winners} val2={stats.p2.winners} />
              <StatRow label="unforced errors" val1={stats.p1.unforcedErrors} val2={stats.p2.unforcedErrors} />
              <StatRow label="forced errors" val1={stats.p1.forcedErrors} val2={stats.p2.forcedErrors} />
              <StatRow label="1st serve points won" val1={stats.p1.firstServePointsWon} val2={stats.p2.firstServePointsWon} />
              <StatRow label="2nd serve points won" val1={stats.p1.secondServePointsWon} val2={stats.p2.secondServePointsWon} />
              <StatRow label="break points saved" val1={stats.p1.breakPointsSaved} val2={stats.p2.breakPointsSaved} />
              <StatRow label="total points won" val1={stats.p1.totalPointsWon} val2={stats.p2.totalPointsWon} />
              <StatRow label="% of points won" val1={stats.p1.pointsWonPct} val2={stats.p2.pointsWonPct} isPercentOnly />
              <StatRow label="0-4 touches (short rallies)" val1={stats.p1.touches04} val2={stats.p2.touches04} />
              <StatRow label="5-8 touches (medium rallies)" val1={stats.p1.touches58} val2={stats.p2.touches58} />
              <StatRow label="9+ touches (long rallies)" val1={stats.p1.touches9plus} val2={stats.p2.touches9plus} />
            </Card>
          )}

          {activeSubTab === 'Shot Stats' && (
            <div className="space-y-12 pb-20">
              {/* Overall Match Breakdown */}
              <div className="space-y-8 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-iosGray tracking-[0.2em]">Match Overview</span>
                  <span className="h-[1px] flex-1 bg-iosDivider/20"></span>
                </div>
                <ShotSection title="Winners" rows={calculateShotBreakdown(filteredPoints, p1.id, p2.id, 'Winner')} />
                <ShotSection title="Forced Errors" rows={calculateShotBreakdown(filteredPoints, p1.id, p2.id, 'Forced Error')} />
                <ShotSection title="Unforced Errors" rows={calculateShotBreakdown(filteredPoints, p1.id, p2.id, 'Unforced Error')} />
              </div>

              {/* Player 1 Analysis */}
              <div className="space-y-8">
                <div className="flex items-center gap-3 ml-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-black uppercase shadow-sm border-2 border-white">{p1.name[0]}</div>
                  <h4 className="text-[14px] uppercase font-black text-black tracking-widest">{p1.name}'s Deep Analysis</h4>
                </div>
                <PlacementEfficiency stats={calculateDetailedShotStats(filteredPoints, p1.id).placementStats} />
                <ErrorAnatomy stats={calculateDetailedShotStats(filteredPoints, p1.id).errorStats} />
              </div>

              {/* Player 2 Analysis */}
              <div className="space-y-8">
                <div className="flex items-center gap-3 ml-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-black uppercase shadow-sm border-2 border-white">{p2.name[0]}</div>
                  <h4 className="text-[14px] uppercase font-black text-black tracking-widest">{p2.name}'s Deep Analysis</h4>
                </div>
                <PlacementEfficiency stats={calculateDetailedShotStats(filteredPoints, p2.id).placementStats} />
                <ErrorAnatomy stats={calculateDetailedShotStats(filteredPoints, p2.id).errorStats} />
              </div>
            </div>
          )}

          {activeSubTab === 'Serve Analysis' && (
            <div className="space-y-12 pb-10">
              <div className="space-y-8">
                <ServePlacementGrid player={p1} stats={calculateServePlacementStats(filteredPoints, p1.id)} />
                <ServeTypeGrid player={p1} stats={calculateServeTypeStats(filteredPoints, p1.id)} />
              </div>
              <div className="space-y-8">
                <ServePlacementGrid player={p2} stats={calculateServePlacementStats(filteredPoints, p2.id)} />
                <ServeTypeGrid player={p2} stats={calculateServeTypeStats(filteredPoints, p2.id)} />
              </div>
            </div>
          )}

          {activeSubTab === 'Match Log' && (
            <div className="bg-white rounded-xl overflow-hidden border border-iosDivider/20 mb-10 shadow-sm">
              {filteredPoints.slice().reverse().map((p, i) => (
                <div key={i} className="flex justify-between items-center px-4 py-5 border-b border-iosDivider/10 bg-white">
                  <div className="w-12 text-primary font-black text-[13px]">{p.scoreAtStart.p1Points}</div>
                  <div className="flex-1 px-4 text-center text-[12px] font-medium text-black/80">{getPointDescription(p, players)}</div>
                  <div className="w-12 text-right font-black text-[13px]">{p.scoreAtStart.p2Points}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-iosDivider/30 flex justify-around px-2 pt-4 pb-10 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveSubTab('Match Stats')} className="flex flex-col items-center gap-1.5 flex-1">
          <i className={`fa-solid fa-chart-simple text-xl ${activeSubTab === 'Match Stats' ? 'text-primary' : 'text-iosGray/40'}`}></i>
          <span className={`text-[8px] font-black uppercase ${activeSubTab === 'Match Stats' ? 'text-primary' : 'text-iosGray/70'}`}>Match Stats</span>
        </button>
        {config.trackServe && config.scoringType === 'Shot Stats' && (
          <button onClick={() => setActiveSubTab('Serve Analysis')} className="flex flex-col items-center gap-1.5 flex-1">
            <i className={`fa-solid fa-baseball text-xl ${activeSubTab === 'Serve Analysis' ? 'text-primary' : 'text-iosGray/40'}`}></i>
            <span className={`text-[8px] font-black uppercase ${activeSubTab === 'Serve Analysis' ? 'text-primary' : 'text-iosGray/70'}`}>Serve Distribution</span>
          </button>
        )}
        {(config.trackShotPlacement || config.trackErrorType) && config.scoringType === 'Shot Stats' && (
          <button onClick={() => setActiveSubTab('Shot Stats')} className="flex flex-col items-center gap-1.5 flex-1">
            <i className={`fa-solid fa-magnifying-glass text-xl ${activeSubTab === 'Shot Stats' ? 'text-primary' : 'text-iosGray/40'}`}></i>
            <span className={`text-[8px] font-black uppercase ${activeSubTab === 'Shot Stats' ? 'text-primary' : 'text-iosGray/70'}`}>Shot Stats</span>
          </button>
        )}
        <button onClick={() => setActiveSubTab('Match Log')} className="flex flex-col items-center gap-1.5 flex-1">
          <i className={`fa-solid fa-list-ul text-xl ${activeSubTab === 'Match Log' ? 'text-primary' : 'text-iosGray/40'}`}></i>
          <span className={`text-[8px] font-black uppercase ${activeSubTab === 'Match Log' ? 'text-primary' : 'text-iosGray/70'}`}>Match Log</span>
        </button>
      </div>

      {showExportPrompt && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in" onClick={() => setShowExportPrompt(false)}>
           <div className="w-full max-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black uppercase tracking-widest text-primary mb-2 text-center">Export Match</h3>
              
              {exportStep === 'player' ? (
                <>
                  <p className="text-iosGray text-sm text-center mb-6 px-4 font-medium">Select the player whose statistics you want to focus on.</p>
                  <div className="space-y-3">
                    <button onClick={() => { setSelectedPlayerId(p1.id); setExportStep('format'); }} className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-wider">Export for {p1.name}</button>
                    <button onClick={() => { setSelectedPlayerId(p2.id); setExportStep('format'); }} className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-wider">Export for {p2.name}</button>
                    <button onClick={() => setShowExportPrompt(false)} className="w-full py-3 text-iosGray font-bold uppercase tracking-widest text-xs mt-2">Cancel</button>
                  </div>
                </>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black uppercase text-iosGray ml-1 mb-1 block">Match Round</label>
                    <input 
                      type="text" 
                      value={exportRound} 
                      onChange={e => setExportRound(e.target.value)} 
                      placeholder="e.g. Qualifying Round 1" 
                      className="w-full bg-iosBg p-3 rounded-xl border-none focus:ring-1 focus:ring-primary text-[15px] font-semibold"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <button onClick={() => exportMatch('pdf')} className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-wider flex items-center justify-center gap-2">
                      <i className="fa-solid fa-file-pdf"></i> Save as PDF (Print)
                    </button>
                    <button onClick={() => exportMatch('doc')} className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-wider flex items-center justify-center gap-2">
                      <i className="fa-solid fa-file-word"></i> Export as DOC (Edit)
                    </button>
                    <button onClick={() => setExportStep('player')} className="w-full py-3 text-primary font-bold uppercase tracking-widest text-xs mt-2">Back</button>
                  </div>
                </div>
              )}
           </div>
        </div>
      )}

      {isNotesOpen && (
        <div className="fixed inset-0 z-[110] bg-black/30 backdrop-blur-[2px] flex items-end" onClick={() => setIsNotesOpen(false)}>
          <div className="w-full bg-white rounded-t-3xl shadow-2xl p-6 pb-12 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase text-primary flex items-center gap-2"><i className="fa-solid fa-note-sticky"></i> Match Notes</h3>
              <button onClick={() => setIsNotesOpen(false)} className="bg-iosBg p-2.5 rounded-full text-iosGray"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <textarea value={notes} onChange={(e) => { setNotes(e.target.value); onUpdateNotes?.(e.target.value); }} placeholder="Match notes..." className="w-full h-64 p-4 bg-iosBg rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-black text-[16px] resize-none font-medium" autoFocus />
            <div className="mt-4 flex justify-end"><button onClick={() => setIsNotesOpen(false)} className="bg-primary text-white font-black uppercase px-8 py-3 rounded-xl shadow-lg">Done</button></div>
          </div>
        </div>
      )}

      {pointModal.show && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in fade-in slide-in-from-bottom-5">
          <div className="flex-1 overflow-y-auto px-6 pt-20 pb-40">
            {config.trackServe && config.scoringType === 'Shot Stats' && (
              <div className="mb-6 animate-in slide-in-from-bottom-2">
                <h3 className="text-[12px] text-center font-bold text-iosGray mb-3 uppercase tracking-widest">Optional: Serve Analysis</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-iosGray uppercase font-black mb-2 block text-center opacity-40">Placement</span>
                    <div className="grid grid-cols-3 gap-3">
                      <BlueBtn label="Wide" active={servePlacement === 'Wide'} onClick={() => setServePlacement(servePlacement === 'Wide' ? null : 'Wide')} className="py-2.5 text-[12px]" />
                      <BlueBtn label="Body" active={servePlacement === 'Body'} onClick={() => setServePlacement(servePlacement === 'Body' ? null : 'Body')} className="py-2.5 text-[12px]" />
                      <BlueBtn label="T" active={servePlacement === 'T'} onClick={() => setServePlacement(servePlacement === 'T' ? null : 'T')} className="py-2.5 text-[12px]" />
                    </div>
                  </div>
                  {servePlacement && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <span className="text-[10px] text-iosGray uppercase font-black mb-2 block text-center opacity-40">Type</span>
                      <div className="grid grid-cols-3 gap-3">
                        <BlueBtn label="Flat" active={serveType === 'Flat'} onClick={() => setServeType(serveType === 'Flat' ? null : 'Flat')} className="py-2.5 text-[12px]" />
                        <BlueBtn label="Slice" active={serveType === 'Slice'} onClick={() => setServeType(serveType === 'Slice' ? null : 'Slice')} className="py-2.5 text-[12px]" />
                        <BlueBtn label="Kick" active={serveType === 'Kick'} onClick={() => setServeType(serveType === 'Kick' ? null : 'Kick')} className="py-2.5 text-[12px]" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <h2 className="text-[18px] text-center font-bold mb-8 uppercase tracking-tight">Outcome for {players.find(p=>p.id===pointModal.winnerId)?.name}</h2>
            <div className="grid grid-cols-2 gap-3 mb-2">
              {showDoubleFault && <BlueBtn label="Double Fault" active={outcome === 'Double Fault'} onClick={() => { setOutcome('Double Fault'); setShotSide(null); setShotKind(null); setRallyLength(0); }} />}
              {!showDoubleFault && showAce && <BlueBtn label="Ace" active={outcome === 'Ace'} onClick={() => { setOutcome('Ace'); setShotSide(null); setShotKind(null); }} />}
              <BlueBtn label="Winner" active={outcome === 'Winner'} onClick={() => { setOutcome('Winner'); }} />
              <BlueBtn label="Unforced Error" active={outcome === 'Unforced Error'} onClick={() => { setOutcome('Unforced Error'); }} />
              <BlueBtn label="Forced Error" active={outcome === 'Forced Error'} onClick={() => { setOutcome('Forced Error'); }} />
            </div>



            {step1Outcome && needsSide && (
              <div className="animate-in slide-in-from-bottom-2">
                <div className="text-center mt-8 mb-2">
                  <span className="text-[9px] font-black uppercase text-primary tracking-[0.2em] opacity-80">
                    {(outcome === 'Unforced Error' || outcome === 'Forced Error') ? "Tracking Loser's Mistake" : "Tracking Winner's Shot"}
                  </span>
                </div>
                <h3 className="text-[12px] text-center font-bold text-black mb-4 uppercase">Side</h3>
                <div className="grid grid-cols-2 gap-3">
                  <BlueBtn label="Forehand" active={shotSide === 'Forehand'} onClick={() => setShotSide('Forehand')} />
                  <BlueBtn label="Backhand" active={shotSide === 'Backhand'} onClick={() => setShotSide('Backhand')} />
                </div>
              </div>
            )}

            {step2Side && (
              <div className="animate-in slide-in-from-bottom-2">
                <h3 className="text-[12px] text-center font-bold text-black mt-8 mb-4 uppercase">Shot Kind</h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['Regular', 'Return', 'Inside-In', 'Inside-Out', 'Passing', 'Approach', 'Slice', 'Volley', 'Drop Shot', 'Lob', 'Overhead'] as ShotKind[]).map(k => (
                    <BlueBtn key={k} label={k} active={shotKind === k} onClick={() => setShotKind(k)} className="text-[12px] py-2" />
                  ))}
                </div>
              </div>
            )}

            {(outcome === 'Winner' || isError) && step2Side && config.trackShotPlacement && (
              <div className="animate-in slide-in-from-bottom-2">
                <h3 className="text-[12px] text-center font-bold text-black mt-8 mb-4 uppercase">
                  {(outcome === 'Unforced Error' || outcome === 'Forced Error') ? "Error Placement" : "Winner's Placement"}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <BlueBtn label="Cross Court" active={location === 'Cross Court'} onClick={() => setLocation('Cross Court')} className="text-[11px] py-2" />
                  <BlueBtn label="Middle" active={location === 'Middle'} onClick={() => setLocation('Middle')} className="text-[11px] py-2" />
                  <BlueBtn label="Down the Line" active={location === 'Down the Line'} onClick={() => setLocation('Down the Line')} className="text-[11px] py-2" />
                </div>
              </div>
            )}

            {(isError && step2Side || isDoubleFault) && config.trackErrorType && (
               <div className="animate-in slide-in-from-bottom-2">
                <h3 className="text-[12px] text-center font-bold text-black mt-8 mb-4 uppercase">Error Type</h3>
                <div className="grid grid-cols-3 gap-2">
                  <BlueBtn label="Net" active={errorType === 'Net'} onClick={() => setErrorType('Net')} />
                  <BlueBtn label="Long" active={errorType === 'Long'} onClick={() => setErrorType('Long')} />
                  <BlueBtn label="Wide" active={errorType === 'Wide'} onClick={() => setErrorType('Wide')} />
                </div>
              </div>
            )}

            <div className="mt-12 px-2">
              <div className="flex items-center justify-between mb-4"><span className="text-[15px] font-bold">Rally Length:</span><span className="text-xl font-bold text-primary">{rallyLength}</span></div>
              <input type="range" min="0" max="30" value={rallyLength} onChange={e => setRallyLength(parseInt(e.target.value))} className="w-full accent-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-md p-6 border-t border-iosDivider flex gap-4 sticky bottom-0 z-50">
            <button onClick={resetModalState} className="flex-1 py-4.5 bg-[#FF3B30] text-white font-bold rounded-2xl text-lg uppercase">Cancel</button>
            <button onClick={handleSavePoint} className="flex-1 py-4.5 bg-primary text-white font-bold rounded-2xl text-lg uppercase">Save Point</button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatRow: React.FC<{ label: string; val1: any; val2: any; isPercentOnly?: boolean }> = ({ label, val1, val2, isPercentOnly }) => {
  const renderValue = (val: any) => {
    if (typeof val === 'object' && val !== null && 'won' in val) {
      const detailed = val as DetailedStat;
      if (isPercentOnly) return <span className="text-[13px] font-bold text-black">{detailed.pct.toFixed(1)}%</span>;
      return <div className="flex flex-col items-center"><span className="text-[13px] font-bold text-black">{detailed.won}/{detailed.total}</span><span className="text-[11px] font-medium text-iosGray">({detailed.pct.toFixed(1)}%)</span></div>;
    }
    if (typeof val === 'number' && isPercentOnly) return <span className="text-[13px] font-bold text-black">{val.toFixed(1)}%</span>;
    return <span className="text-[14px] font-bold text-black">{val}</span>;
  };
  return <div className="flex justify-between items-center px-4 py-4 border-b border-iosDivider/10 bg-white">
    <div className="flex-1 flex justify-start">{renderValue(val1)}</div>
    <span className="text-[12px] text-iosGray font-semibold flex-[1.5] text-center uppercase tracking-tight px-2 leading-tight">{label}</span>
    <div className="flex-1 flex justify-end">{renderValue(val2)}</div>
  </div>;
};

const ShotSection: React.FC<{ title: string; rows: any[] }> = ({ title, rows }) => (
  <section className="mb-4">
    <h4 className="text-[10px] uppercase font-bold text-iosGray mb-2 ml-4 tracking-widest">{title}</h4>
    <Card className="divide-y divide-iosDivider/10 bg-white shadow-none border-t border-b border-iosDivider/30 rounded-none">
      {rows.map((row, i) => (
        <div key={i} className={`flex justify-between items-center px-4 py-3.5 ${row.label === 'Total' ? 'bg-iosBg/40' : ''}`}>
          <span className={`text-[13px] w-12 text-left tabular-nums ${row.label === 'Total' ? 'font-black' : 'font-medium'}`}>{row.p1}</span>
          <span className={`text-[12px] flex-1 text-center ${row.label === 'Total' ? 'font-black uppercase tracking-widest' : 'text-black font-medium'}`}>{row.label}</span>
          <span className={`text-[13px] w-12 text-right tabular-nums ${row.label === 'Total' ? 'font-black' : 'font-medium'}`}>{row.p2}</span>
        </div>
      ))}
    </Card>
  </section>
);

const ServePlacementGrid: React.FC<{ player: Player; stats: any }> = ({ player, stats }) => {
  const placements: ServePlacement[] = ['Wide', 'Body', 'T'];
  const courts: CourtSide[] = ['Deuce', 'Ad'];
  
  // Find total aces and max ace count for distribution analysis
  let totalPlayerAces = 0;
  let maxAces = 0;
  courts.forEach(court => {
    placements.forEach(p => {
      const s = stats[court]?.[p] || { total: 0, won: 0, aces: 0 };
      totalPlayerAces += s.aces;
      if (s.aces > maxAces) maxAces = s.aces;
    });
  });
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 ml-4">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-black uppercase shadow-sm border-2 border-white">{player.name[0]}</div>
        <h4 className="text-[14px] uppercase font-black text-black tracking-widest">{player.name}'s Serve Placement</h4>
      </div>
      
      {courts.map(court => (
        <div key={court} className="space-y-3">
          <div className="flex items-center gap-2 px-4">
            <span className="h-[1px] flex-1 bg-iosDivider/20"></span>
            <span className="text-[10px] font-black uppercase text-iosGray tracking-[0.2em]">{court} Court</span>
            <span className="h-[1px] flex-1 bg-iosDivider/20"></span>
          </div>
          <div className="grid grid-cols-3 gap-3 px-2">
            {placements.map(p => {
              const s = stats[court]?.[p] || { total: 0, won: 0, aces: 0 };
              const winPct = s.total > 0 ? (s.won / s.total * 100).toFixed(0) : '0';
              // Calculate distribution: Ace at this spot / Total Aces
              const acePct = totalPlayerAces > 0 ? (s.aces / totalPlayerAces * 100).toFixed(0) : '0';
              const isHighSuccess = Number(winPct) >= 70 && s.total > 0;
              const isAceHotspot = s.aces > 0 && s.aces === maxAces;
              const isHighAceDist = Number(acePct) >= 40 && totalPlayerAces >= 3;
              
              return (
                <Card key={`${court}-${p}`} className={`p-4 border-none shadow-sm flex flex-col items-center justify-center text-center transition-all ${isAceHotspot ? 'ring-2 ring-yellow-400 bg-yellow-50/30' : isHighSuccess ? 'ring-2 ring-primary bg-primary/5' : 'bg-white'}`}>
                  <span className="text-[10px] font-black uppercase text-iosGray mb-2 tracking-widest">{p}</span>
                  <div className="grid grid-cols-2 gap-3 w-full mb-2">
                    <div className="flex flex-col items-center border-r border-iosDivider/20">
                      <span className={`text-xl font-black tabular-nums leading-none ${isHighSuccess ? 'text-primary' : 'text-black'}`}>{winPct}%</span>
                      <span className="text-[7px] font-bold text-iosGray uppercase opacity-50 mt-1">Win Rate</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className={`text-xl font-black tabular-nums leading-none ${isHighAceDist || isAceHotspot ? 'text-yellow-600' : 'text-black'}`}>{acePct}%</span>
                      <span className="text-[7px] font-bold text-iosGray uppercase opacity-50 mt-1">Ace Dist.</span>
                    </div>
                  </div>
                  <div className="text-[9px] font-bold text-iosGray opacity-60">
                    <span className="text-black">{s.aces} <span className="opacity-40">Aces</span></span> • {s.total} <span className="opacity-40">pts</span>
                  </div>
                  <div className="h-4 flex items-center justify-center mt-2">
                    {isAceHotspot && (
                       <div className="bg-yellow-400 text-black text-[6px] font-black py-0.5 px-2 rounded-full uppercase tracking-tighter shadow-sm flex items-center gap-1">
                         <i className="fa-solid fa-fire text-[5px]"></i> Ace Hotspot
                       </div>
                    )}
                    {!isAceHotspot && isHighSuccess && (
                       <div className="bg-primary text-white text-[6px] font-bold py-0.5 px-1.5 rounded-full uppercase tracking-tighter">Effective</div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const PlacementEfficiency: React.FC<{ stats: Record<ShotLocation, { winners: number; total: number }> }> = ({ stats }) => {
  const locations: ShotLocation[] = ['Cross Court', 'Middle', 'Down the Line'];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4">
        <span className="text-[10px] font-black uppercase text-iosGray tracking-[0.2em]">Shot Placement</span>
        <span className="h-[1px] flex-1 bg-iosDivider/20"></span>
      </div>
      <div className="grid grid-cols-3 gap-3 px-2">
        {locations.map(loc => {
          const s = stats[loc];
          const winPct = s.total > 0 ? (s.winners / s.total * 100).toFixed(0) : '0';
          const isHighSuccess = Number(winPct) >= 60 && s.total > 0;

          return (
            <Card key={loc} className={`p-4 border-none shadow-sm flex flex-col items-center justify-center text-center ${isHighSuccess ? 'ring-2 ring-primary bg-primary/5' : 'bg-white'}`}>
              <span className="text-[9px] font-black uppercase text-iosGray mb-1 tracking-tighter h-6 flex items-center">{loc}</span>
              <div className="flex flex-col items-center mb-1">
                <span className={`text-xl font-black ${isHighSuccess ? 'text-primary' : 'text-black'}`}>{winPct}%</span>
                <span className="text-[8px] font-bold text-iosGray uppercase opacity-40">Win Rate</span>
              </div>
              <div className="text-[10px] font-bold text-iosGray opacity-60">
                {s.winners} / {s.total} <span className="text-[8px] uppercase">pts</span>
              </div>
              {isHighSuccess && (
                <div className="mt-2 bg-primary text-white text-[6px] font-bold py-0.5 px-1.5 rounded-full uppercase tracking-tighter">Effective</div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const ErrorAnatomy: React.FC<{ stats: Record<ErrorType, number> }> = ({ stats }) => {
  const errors: ErrorType[] = ['Net', 'Long', 'Wide'];
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4">
        <span className="text-[10px] font-black uppercase text-[#FF3B30] tracking-[0.2em]">Error Breakdown</span>
        <span className="h-[1px] flex-1 bg-[#FF3B30]/10"></span>
      </div>
      <div className="px-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-iosDivider/5">
          <div className="flex h-3 rounded-full overflow-hidden mb-4 bg-iosBg">
            {errors.map(err => {
              const pct = total > 0 ? (stats[err] / total * 100) : 0;
              const color = err === 'Net' ? 'bg-[#FF3B30]' : err === 'Long' ? 'bg-[#FF9500]' : 'bg-[#5856D6]';
              return (
                <div key={err} style={{ width: `${pct}%` }} className={`${color} transition-all duration-500`} />
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {errors.map(err => {
              const pct = total > 0 ? (stats[err] / total * 100).toFixed(0) : '0';
              const colorText = err === 'Net' ? 'text-[#FF3B30]' : err === 'Long' ? 'text-[#FF9500]' : 'text-[#5856D6]';
              return (
                <div key={err} className="flex flex-col items-center">
                  <span className={`text-[12px] font-black ${colorText}`}>{pct}%</span>
                  <span className="text-[8px] font-bold text-iosGray uppercase opacity-40">{err}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const ServeTypeGrid: React.FC<{ player: Player; stats: any }> = ({ player, stats }) => {
  const types: ServeType[] = ['Flat', 'Slice', 'Kick'];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4">
        <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Serve Type Breakdown</span>
        <span className="h-[1px] flex-1 bg-primary/10"></span>
      </div>
      <div className="grid grid-cols-3 gap-3 px-2">
        {types.map(t => {
          const s = stats[t] || { total: 0, won: 0, aces: 0 };
          const winPct = s.total > 0 ? (s.won / s.total * 100).toFixed(0) : '0';
          
          return (
            <div key={t} className="bg-white p-3 rounded-xl shadow-sm border border-iosDivider/5 flex flex-col items-center">
              <span className="text-[9px] font-bold text-iosGray uppercase mb-1">{t}</span>
              <span className="text-xl font-black text-black">{winPct}%</span>
              <span className="text-[8px] font-bold text-iosGray uppercase opacity-40 mb-2">Win Rate</span>
              <div className="flex justify-between w-full text-[9px] font-bold px-1 border-t border-iosDivider/10 pt-1.5 mt-auto">
                <span className="text-primary">{s.won}W</span>
                <span className="text-iosGray">{s.total}T</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveMatchView;
