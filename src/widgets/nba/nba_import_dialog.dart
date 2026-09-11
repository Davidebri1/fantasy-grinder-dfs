import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:provider/provider.dart';
import '../../config/supabase_config.dart';
import '../../models/nba/nba_import_preview.dart';
import '../../models/nba/nba_player.dart';
import '../../models/nba/nba_roster_slot.dart';
import '../../providers/nba/nba_player_provider.dart';
import '../../constants/nba_teams.dart';
import '../../services/nba/nba_projection_template_export_service.dart';

enum NbaImportMode { players, projections }

/// 3-step import wizard dialog for NBA player pool CSV files.
///
/// Step 0 – File: Pick a DraftKings CSV and choose replace/merge.
/// Step 1 – Preview: Shows detected columns, player breakdown, preview table.
/// Step 2 – Done: Import confirmed, shows success animation.
class NbaImportDialog extends StatefulWidget {
  final NbaImportMode mode;
  final NbaContestType contestType;

  const NbaImportDialog({
    super.key,
    required this.mode,
    required this.contestType,
  });

  @override
  State<NbaImportDialog> createState() => _NbaImportDialogState();
}

class _NbaImportDialogState extends State<NbaImportDialog> {
  // ── State ──────────────────────────────────────────────────────────
  int _currentStep = 0; // 0 = file pick, 1 = preview, 2 = processing, 3 = done
  String? _fileName;
  PlatformFile? _pickedFile;
  bool _isLoading = false;
  String? _error;
  bool _replaceExisting = true;
  NbaImportPreview? _preview;

  // Progress tracking for step 2 (processing)
  double _importProgress = 0.0;
  String _importStatusText = '';
  int _processedCount = 0;

  // ── Step 0: File picking ───────────────────────────────────────────

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv'],
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        setState(() {
          _pickedFile = result.files.first;
          _fileName = _pickedFile!.name;
          _error = null;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to pick file: $e';
      });
    }
  }

  /// Parse the file and move to preview step.
  void _parseAndPreview() {
    if (_pickedFile?.bytes == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      if (widget.mode == NbaImportMode.players) {
        final provider = context.read<NbaPlayerProvider>();
        final preview = provider.previewFromCsv(_pickedFile!.bytes!);

        if (preview.players.isEmpty) {
          setState(() {
            _isLoading = false;
            _error = 'No players found in the CSV file.';
          });
          return;
        }

        setState(() {
          _isLoading = false;
          _preview = preview;
          _currentStep = 1;
        });
      } else {
        // For projections mode, go straight to import
        _pickAndImportProjections();
      }
    } on FormatException catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'CSV format error: ${e.message}';
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Parse error: $e';
      });
    }
  }

  // ── Step 1 → 2 → 3: Confirm import with progress ─────────────────

  void _confirmImport() {
    if (_preview == null) return;

    setState(() {
      _isLoading = true;
      _currentStep = 2; // Move to processing step
      _importProgress = 0.0;
      _processedCount = 0;
      _importStatusText = 'Preparing import…';
    });

    _runImportWithProgress();
  }

  Future<void> _runImportWithProgress() async {
    final players = _preview!.players;
    final totalPlayers = players.length;

    // Phase 1: Parsing columns (quick visual phase)
    setState(() {
      _importStatusText = 'Reading CSV structure…';
      _importProgress = 0.05;
    });
    await Future.delayed(const Duration(milliseconds: 200));

    // Phase 2: Detecting positions & teams
    setState(() {
      _importStatusText = 'Detecting positions & teams…';
      _importProgress = 0.10;
    });
    await Future.delayed(const Duration(milliseconds: 200));

    // Phase 3: Validate each player with animated progress
    final teams = <String>{};
    final positions = <String>{};

    for (int i = 0; i < totalPlayers; i++) {
      final player = players[i];
      teams.add(player.team);
      positions.addAll(player.positions);

      // Update UI every few players (throttled for smooth animation)
      if (i % 3 == 0 || i == totalPlayers - 1) {
        if (!mounted) return;
        setState(() {
          _processedCount = i + 1;
          _importProgress = 0.15 + (0.70 * (i + 1) / totalPlayers);
          _importStatusText =
              'Processing ${player.name} '
              '(${i + 1}/$totalPlayers)…';
        });
        // Small delay so the UI actually updates and user sees progress
        await Future.delayed(const Duration(milliseconds: 30));
      }
    }

    // Phase 4: Committing to player pool
    if (!mounted) return;
    setState(() {
      _importStatusText = 'Committing $totalPlayers players to pool…';
      _importProgress = 0.90;
    });
    await Future.delayed(const Duration(milliseconds: 150));

    if (!mounted) return;
    final provider = context.read<NbaPlayerProvider>();
    provider.confirmImport(players, replace: _replaceExisting);

    // Phase 5: Done
    if (!mounted) return;
    setState(() {
      _importProgress = 1.0;
      _importStatusText = 'Import complete!';
    });
    await Future.delayed(const Duration(milliseconds: 300));

    if (!mounted) return;
    setState(() {
      _currentStep = 3; // Move to done step
      _isLoading = false;
    });

    // Auto-close after brief success display
    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) Navigator.of(context).pop(true);
    });
  }

  // ── Build ──────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isPlayerImport = widget.mode == NbaImportMode.players;

    // For projection import, use the simple dialog pattern
    if (!isPlayerImport) {
      return _buildProjectionDialog(theme);
    }

    return AlertDialog(
      title: Row(
        children: [
          Icon(_stepIcon, color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          Text(_stepTitle),
        ],
      ),
      content: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 700,
          maxHeight: MediaQuery.of(context).size.height * 0.75,
        ),
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child:
              _currentStep == 0
                  ? _buildFilePickStep(theme)
                  : _currentStep == 1
                  ? _buildPreviewStep(theme)
                  : _currentStep == 2
                  ? _buildProcessingStep(theme)
                  : _buildDoneStep(theme),
        ),
      ),
      actions: _buildActions(theme),
    );
  }

  IconData get _stepIcon {
    switch (_currentStep) {
      case 0:
        return Icons.upload_file;
      case 1:
        return Icons.preview;
      case 2:
        return Icons.sync;
      case 3:
        return Icons.check_circle;
      default:
        return Icons.upload_file;
    }
  }

  String get _stepTitle {
    switch (_currentStep) {
      case 0:
        return 'Import DraftKings NBA CSV';
      case 1:
        return 'Preview Import';
      case 2:
        return 'Importing Players…';
      case 3:
        return 'Import Complete';
      default:
        return 'Import';
    }
  }

  // ── Step 0: File selection ─────────────────────────────────────────

  Widget _buildFilePickStep(ThemeData theme) {
    return Column(
      key: const ValueKey('step0'),
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Step indicator
        _buildStepIndicator(theme),
        const SizedBox(height: 16),
        const Text(
          'Import a DraftKings NBA contest CSV export file.\n'
          'Supports dual-section DraftKings exports — headers at row J8.\n'
          'Player positions, salaries, game info, and projections will be extracted.',
          style: TextStyle(fontSize: 13, color: Colors.grey),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: _isLoading ? null : _pickFile,
          icon: const Icon(Icons.folder_open),
          label: Text(_fileName ?? 'Choose CSV file...'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
        ),
        if (_fileName != null) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.check_circle, size: 16, color: Colors.green[400]),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  _fileName!,
                  style: const TextStyle(fontSize: 13),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
        const SizedBox(height: 16),
        SwitchListTile(
          title: const Text(
            'Replace existing players',
            style: TextStyle(fontSize: 14),
          ),
          subtitle: Text(
            _replaceExisting
                ? 'Current player pool will be replaced'
                : 'New players will be added to current pool',
            style: const TextStyle(fontSize: 12),
          ),
          value: _replaceExisting,
          onChanged: (v) => setState(() => _replaceExisting = v),
          dense: true,
          contentPadding: EdgeInsets.zero,
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          _buildErrorBox(_error!),
        ],
      ],
    );
  }

  // ── Step 1: Preview ────────────────────────────────────────────────

  Widget _buildPreviewStep(ThemeData theme) {
    final preview = _preview!;
    final players = preview.players;
    final displayCount = players.length > 20 ? 20 : players.length;

    return Column(
      key: const ValueKey('step1'),
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Step indicator
        _buildStepIndicator(theme),
        const SizedBox(height: 12),

        // Detection banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.green.withAlpha(25),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.green.withAlpha(77)),
          ),
          child: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Found header at row ${preview.headerRow + 1} · '
                  '${players.length} players detected · '
                  '${preview.gameCount} game${preview.gameCount == 1 ? '' : 's'} · '
                  '${preview.teamCount} teams',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.green[300],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Column mapping chips
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children:
              preview.detectedColumns.entries.map((e) {
                return Chip(
                  avatar: Icon(
                    Icons.table_chart,
                    size: 14,
                    color: theme.colorScheme.primary,
                  ),
                  label: Text(
                    '${e.key} → Col ${_colLetter(e.value)}',
                    style: const TextStyle(fontSize: 11),
                  ),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                );
              }).toList(),
        ),
        const SizedBox(height: 12),

        // Summary bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest.withAlpha(128),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Wrap(
            spacing: 16,
            runSpacing: 4,
            children: [
              _summaryItem(Icons.people, '${players.length} players'),
              _summaryItem(Icons.attach_money, preview.salaryRange),
              _summaryItem(
                Icons.sports_basketball,
                '${preview.gameCount} games',
              ),
              _summaryItem(Icons.groups, '${preview.teamCount} teams'),
              if (preview.zeroProjectionCount > 0)
                _summaryItem(
                  Icons.warning_amber,
                  '${preview.zeroProjectionCount} zero proj',
                  Colors.amber,
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Position + Team breakdown row
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Position breakdown
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHigh.withAlpha(128),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Positions',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children:
                          preview.positionBreakdown.entries.map((e) {
                            return _PositionBadge(
                              position: e.key,
                              count: e.value,
                            );
                          }).toList(),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            // Team breakdown
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHigh.withAlpha(128),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Teams',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children:
                          preview.teamBreakdown.entries.map((e) {
                            final color = NbaTeams.getColor(e.key);
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: color.withAlpha(40),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: color.withAlpha(100)),
                              ),
                              child: Text(
                                '${e.key} (${e.value})',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: color,
                                ),
                              ),
                            );
                          }).toList(),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Warnings
        if (preview.warnings.isNotEmpty) ...[
          ...preview.warnings.map(
            (w) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  Icon(Icons.warning_amber, size: 14, color: Colors.amber[600]),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      w,
                      style: TextStyle(fontSize: 12, color: Colors.amber[600]),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],

        // Player preview table
        Flexible(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SingleChildScrollView(
              child: DataTable(
                columnSpacing: 14,
                dataRowMinHeight: 30,
                dataRowMaxHeight: 34,
                headingRowHeight: 34,
                columns: const [
                  DataColumn(
                    label: Text(
                      'Name',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Pos',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Team',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Salary',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    numeric: true,
                  ),
                  DataColumn(
                    label: Text(
                      'Proj',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    numeric: true,
                  ),
                  DataColumn(
                    label: Text(
                      'Opponent',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  DataColumn(
                    label: Text(
                      'Game Info',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
                rows: [
                  for (int i = 0; i < displayCount; i++)
                    _buildPlayerRow(players[i]),
                  if (players.length > displayCount)
                    DataRow(
                      cells: [
                        DataCell(
                          Text(
                            '… and ${players.length - displayCount} more',
                            style: const TextStyle(
                              fontSize: 12,
                              fontStyle: FontStyle.italic,
                              color: Colors.grey,
                            ),
                          ),
                        ),
                        const DataCell(SizedBox.shrink()),
                        const DataCell(SizedBox.shrink()),
                        const DataCell(SizedBox.shrink()),
                        const DataCell(SizedBox.shrink()),
                        const DataCell(SizedBox.shrink()),
                        const DataCell(SizedBox.shrink()),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  DataRow _buildPlayerRow(NbaPlayer player) {
    final teamColor = NbaTeams.getColor(player.team);
    return DataRow(
      cells: [
        DataCell(Text(player.name, style: const TextStyle(fontSize: 12))),
        DataCell(
          Wrap(
            spacing: 3,
            children:
                player.positions.map((pos) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 5,
                      vertical: 1,
                    ),
                    decoration: BoxDecoration(
                      color: _positionColor(pos).withAlpha(40),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      pos,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: _positionColor(pos),
                      ),
                    ),
                  );
                }).toList(),
          ),
        ),
        DataCell(
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: teamColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 4),
              Text(player.team, style: const TextStyle(fontSize: 12)),
            ],
          ),
        ),
        DataCell(
          Text('\$${player.salary}', style: const TextStyle(fontSize: 12)),
        ),
        DataCell(
          Text(
            player.projection.toStringAsFixed(1),
            style: TextStyle(
              fontSize: 12,
              color: player.projection == 0 ? Colors.amber : null,
            ),
          ),
        ),
        DataCell(
          Text(
            player.opponent.isNotEmpty ? player.opponent : '—',
            style: TextStyle(
              fontSize: 12,
              color: player.opponent.isEmpty ? Colors.grey : null,
            ),
          ),
        ),
        DataCell(
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 200),
            child: Text(
              player.gameInfo,
              style: const TextStyle(fontSize: 11),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ),
      ],
    );
  }

  // ── Step 2: Processing with progress bar ───────────────────────────

  Widget _buildProcessingStep(ThemeData theme) {
    final totalPlayers = _preview?.players.length ?? 0;
    final percentage = (_importProgress * 100).toInt();

    return Column(
      key: const ValueKey('step2'),
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildStepIndicator(theme),
        const SizedBox(height: 32),

        // Large progress indicator
        Center(
          child: SizedBox(
            width: 80,
            height: 80,
            child: Stack(
              fit: StackFit.expand,
              children: [
                CircularProgressIndicator(
                  value: _importProgress,
                  strokeWidth: 6,
                  backgroundColor: theme.colorScheme.surfaceContainerHighest,
                  color: theme.colorScheme.primary,
                ),
                Center(
                  child: Text(
                    '$percentage%',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),

        // Status text
        Center(
          child: Text(
            _importStatusText,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: theme.colorScheme.onSurface,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: 8),

        // Player count progress
        Center(
          child: Text(
            '$_processedCount of $totalPlayers players',
            style: TextStyle(
              fontSize: 12,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
        const SizedBox(height: 20),

        // Linear progress bar
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: _importProgress,
            minHeight: 8,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
            color: theme.colorScheme.primary,
          ),
        ),
        const SizedBox(height: 12),

        // Phase descriptions
        _buildPhaseRow(
          'Read CSV structure',
          _importProgress >= 0.05,
          _importProgress >= 0.10,
          theme,
        ),
        _buildPhaseRow(
          'Detect positions & teams',
          _importProgress >= 0.10,
          _importProgress >= 0.15,
          theme,
        ),
        _buildPhaseRow(
          'Validate players',
          _importProgress >= 0.15,
          _importProgress >= 0.85,
          theme,
        ),
        _buildPhaseRow(
          'Commit to player pool',
          _importProgress >= 0.90,
          _importProgress >= 1.0,
          theme,
        ),

        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildPhaseRow(
    String label,
    bool started,
    bool completed,
    ThemeData theme,
  ) {
    final Color iconColor;
    final IconData icon;
    if (completed) {
      icon = Icons.check_circle;
      iconColor = Colors.green;
    } else if (started) {
      icon = Icons.sync;
      iconColor = theme.colorScheme.primary;
    } else {
      icon = Icons.circle_outlined;
      iconColor = theme.colorScheme.outline;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Icon(icon, size: 16, color: iconColor),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color:
                  started
                      ? theme.colorScheme.onSurface
                      : theme.colorScheme.onSurfaceVariant,
              fontWeight: started ? FontWeight.w500 : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  // ── Step 3: Done ───────────────────────────────────────────────────

  Widget _buildDoneStep(ThemeData theme) {
    final playerCount = _preview?.players.length ?? 0;
    return Column(
      key: const ValueKey('step3'),
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildStepIndicator(theme),
        const SizedBox(height: 24),
        Icon(Icons.check_circle, size: 64, color: Colors.green[400]),
        const SizedBox(height: 16),
        Text(
          'Imported $playerCount player${playerCount == 1 ? '' : 's'}!',
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Text(
          _replaceExisting
              ? 'Player pool has been replaced.'
              : 'New players added to existing pool.',
          style: const TextStyle(fontSize: 13, color: Colors.grey),
        ),
        if (_preview != null) ...[
          const SizedBox(height: 16),
          Wrap(
            spacing: 16,
            runSpacing: 4,
            alignment: WrapAlignment.center,
            children: [
              _summaryItem(Icons.groups, '${_preview!.teamCount} teams'),
              _summaryItem(
                Icons.sports_basketball,
                '${_preview!.gameCount} games',
              ),
              _summaryItem(Icons.attach_money, _preview!.salaryRange),
            ],
          ),
        ],
        const SizedBox(height: 24),
      ],
    );
  }

  // ── Projection import (simple mode) ────────────────────────────────

  Widget _buildProjectionDialog(ThemeData theme) {
    final supabaseConfigured = SupabaseConfig.isConfigured;
    final playerProvider = context.watch<NbaPlayerProvider>();
    final hasPlayers = playerProvider.allPlayers.isNotEmpty;
    final hasUserProjectionOverrides = playerProvider.hasUserProjectionOverrides;

    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.analytics),
          SizedBox(width: 8),
          Text('Import Projections'),
        ],
      ),
      content: SizedBox(
        width: 450,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Upload custom projections into User Proj from an Excel or CSV '
              'file, or load the latest ${widget.contestType.label.toLowerCase()} '
              'snapshot from Supabase.\n'
              'The template download includes player names with Projection set '
              'to 0. Required columns for upload: Name (or ID) and Projection '
              '(or FPTS).',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            if (!hasPlayers)
              Text(
                'Load a player pool first to download a projection template.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Colors.grey[700],
                ),
              ),
            if (!supabaseConfigured)
              Text(
                'Supabase loading is unavailable until SUPABASE_URL and '
                'SUPABASE_ANON_KEY are configured.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Colors.grey[700],
                ),
              ),
            if (!supabaseConfigured) const SizedBox(height: 16),
            if (_error != null) _buildErrorBox(_error!),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        OutlinedButton.icon(
          onPressed:
              _isLoading || !hasUserProjectionOverrides
                  ? null
                  : _resetUserProjections,
          icon: const Icon(Icons.restore),
          label: const Text('Reset User Proj'),
        ),
        OutlinedButton.icon(
          onPressed:
              _isLoading || !hasPlayers ? null : _downloadProjectionTemplate,
          icon: const Icon(Icons.download),
          label: const Text('Get Template'),
        ),
        FilledButton.icon(
          onPressed: _isLoading ? null : _pickAndImportProjections,
          icon:
              _isLoading
                  ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                  : const Icon(Icons.folder_open),
          label: Text(_isLoading ? 'Importing...' : 'Upload File'),
        ),
        OutlinedButton.icon(
          onPressed:
              _isLoading || !supabaseConfigured
                  ? null
                  : () => _loadProjectionsFromSupabase(widget.contestType),
          icon: const Icon(Icons.cloud_download),
          label: Text('Load ${widget.contestType.label}'),
        ),
      ],
    );
  }

  Future<void> _pickAndImportProjections() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv', 'xlsx'],
        withData: true,
      );

      if (result == null || result.files.isEmpty) {
        setState(() => _isLoading = false);
        return;
      }

      final bytes = result.files.first.bytes;
      if (bytes == null) {
        setState(() {
          _error = 'Could not read file data.';
          _isLoading = false;
        });
        return;
      }

      if (!mounted) return;
      final provider = context.read<NbaPlayerProvider>();
      final importResult = await provider.importProjections(
        bytes,
        fileName: result.files.first.name,
      );

      if (mounted) {
        Navigator.of(context).pop(true);
        final message =
            importResult.saveResult.supabaseSkipped
                ? '${importResult.importResult.summary} · Local changes only'
                : '${importResult.importResult.summary} · ${importResult.saveResult.summary}';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _error = 'Import failed: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _downloadProjectionTemplate() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final provider = context.read<NbaPlayerProvider>();
      final result = await NbaProjectionTemplateExportService.exportTemplate(
        provider.allPlayers,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _isLoading = false;
      });

      if (!result.saved) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Saved ${result.fileName} with ${result.rowCount} players.',
          ),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isLoading = false;
        _error = 'Template download failed: $e';
      });
    }
  }

  Future<void> _resetUserProjections() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder:
          (dialogContext) => AlertDialog(
            title: const Text('Reset User Projections?'),
            content: const Text(
              'This will copy the original projection values back into User Proj for every player with a custom override.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('Reset'),
              ),
            ],
          ),
    );

    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final provider = context.read<NbaPlayerProvider>();
      final result = await provider.resetUserProjectionsToOriginal();

      if (!mounted) {
        return;
      }

      Navigator.of(context).pop(true);
      final saveSummary = result.saveResult?.summary;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.resetCount == 0
                ? 'User Proj already matches the original projections.'
                : saveSummary == null || saveSummary.isEmpty
                ? 'Reset ${result.resetCount} User Proj value(s) to the original projections.'
                : 'Reset ${result.resetCount} User Proj value(s) to the original projections · $saveSummary',
          ),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isLoading = false;
        _error = 'Reset failed: $e';
      });
    }
  }

  Future<void> _loadProjectionsFromSupabase(NbaContestType contestType) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final provider = context.read<NbaPlayerProvider>();
      final importResult = await provider.applySupabaseProjections();

      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Loaded ${contestType.label.toLowerCase()} projections from Supabase · '
            '${importResult.importResult.summary}',
          ),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Supabase load failed: $e';
        _isLoading = false;
      });
    }
  }

  // ── Actions ────────────────────────────────────────────────────────

  List<Widget> _buildActions(ThemeData theme) {
    switch (_currentStep) {
      case 0:
        return [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            onPressed:
                (_pickedFile?.bytes != null && !_isLoading)
                    ? _parseAndPreview
                    : null,
            icon:
                _isLoading
                    ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                    : const Icon(Icons.arrow_forward, size: 18),
            label: Text(_isLoading ? 'Parsing…' : 'Next: Preview'),
          ),
        ];
      case 1:
        return [
          TextButton(
            onPressed:
                () => setState(() {
                  _currentStep = 0;
                  _preview = null;
                }),
            child: const Text('← Back'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            onPressed: _confirmImport,
            icon: const Icon(Icons.download, size: 18),
            label: Text('Import ${_preview?.players.length ?? 0} Players'),
          ),
        ];
      case 2:
        return []; // Processing — no actions (auto-advancing)
      case 3:
        return []; // Done — auto-closing
      default:
        return [];
    }
  }

  // ── Shared helpers ─────────────────────────────────────────────────

  Widget _buildStepIndicator(ThemeData theme) {
    return Row(
      children: [
        _stepDot(0, 'File', theme),
        _stepLine(theme),
        _stepDot(1, 'Preview', theme),
        _stepLine(theme),
        _stepDot(2, 'Import', theme),
        _stepLine(theme),
        _stepDot(3, 'Done', theme),
      ],
    );
  }

  Widget _stepDot(int step, String label, ThemeData theme) {
    final isActive = _currentStep >= step;
    final color =
        isActive ? theme.colorScheme.primary : theme.colorScheme.outline;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircleAvatar(
          radius: 12,
          backgroundColor: isActive ? color : Colors.transparent,
          foregroundColor: isActive ? Colors.white : color,
          child:
              _currentStep > step
                  ? const Icon(Icons.check, size: 14)
                  : Text(
                    '${step + 1}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: color,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _stepLine(ThemeData theme) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 16),
        color: theme.colorScheme.outline.withAlpha(77),
      ),
    );
  }

  Widget _summaryItem(IconData icon, String text, [Color? color]) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color ?? Colors.grey),
        const SizedBox(width: 4),
        Text(text, style: TextStyle(fontSize: 12, color: color ?? Colors.grey)),
      ],
    );
  }

  Widget _buildErrorBox(String message) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withAlpha(25),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.withAlpha(77)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: Colors.red, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  /// Convert 0-based column index to Excel-style letter (0→A, 9→J, etc.)
  static String _colLetter(int index) {
    String result = '';
    int i = index;
    while (i >= 0) {
      result = String.fromCharCode(65 + (i % 26)) + result;
      i = (i ~/ 26) - 1;
    }
    return result;
  }

  /// Color for position badges.
  static Color _positionColor(String pos) {
    switch (pos) {
      case 'PG':
        return Colors.blue;
      case 'SG':
        return Colors.cyan;
      case 'SF':
        return Colors.green;
      case 'PF':
        return Colors.orange;
      case 'C':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

/// Compact position badge widget for the preview breakdown.
class _PositionBadge extends StatelessWidget {
  final String position;
  final int count;

  const _PositionBadge({required this.position, required this.count});

  @override
  Widget build(BuildContext context) {
    final color = _NbaImportDialogState._positionColor(position);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withAlpha(40),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withAlpha(100)),
      ),
      child: Text(
        '$position ($count)',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
    );
  }
}
