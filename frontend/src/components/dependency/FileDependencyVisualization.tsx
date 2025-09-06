import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '@/lib/utils';
import { FileText, Component, Database, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface DependencyNode {
  id: string;
  name: string;
  type: 'file' | 'component' | 'service' | 'database' | 'api';
  status: 'healthy' | 'warning' | 'error';
  dependencies: string[];
  dependents: string[];
  impact: number;
  path?: string;
  lastModified?: Date;
  size?: number;
}

interface FileDependencyVisualizationProps {
  projectId: string;
  className?: string;
  height?: string;
  showControls?: boolean;
  showMiniMap?: boolean;
  onNodeClick?: (node: DependencyNode) => void;
}

const FileDependencyVisualization: React.FC<FileDependencyVisualizationProps> = ({
  projectId,
  className,
  height = '400px',
  showControls = true,
  showMiniMap = true,
  onNodeClick,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR' | 'RL'>('TB');

  // Mock dependency data - in real implementation, this would come from API
  const mockDependencyData: DependencyNode[] = [
    {
      id: 'app-page',
      name: 'app/page.tsx',
      type: 'file',
      status: 'healthy',
      dependencies: ['header-component', 'main-layout', 'project-store'],
      dependents: [],
      impact: 0.9,
      path: '/src/app/page.tsx',
      lastModified: new Date(),
      size: 2048,
    },
    {
      id: 'header-component',
      name: 'Header.tsx',
      type: 'component',
      status: 'healthy',
      dependencies: ['user-store', 'navigation-service'],
      dependents: ['app-page'],
      impact: 0.7,
      path: '/src/components/Header.tsx',
      lastModified: new Date(),
      size: 1024,
    },
    {
      id: 'main-layout',
      name: 'MainLayout.tsx',
      type: 'component',
      status: 'healthy',
      dependencies: ['resizable-panels', 'chat-interface'],
      dependents: ['app-page'],
      impact: 0.8,
      path: '/src/components/MainLayout.tsx',
      lastModified: new Date(),
      size: 1536,
    },
    {
      id: 'chat-interface',
      name: 'ChatInterface.tsx',
      type: 'component',
      status: 'warning',
      dependencies: ['chat-store', 'websocket-client', 'message-service'],
      dependents: ['main-layout'],
      impact: 0.95,
      path: '/src/components/chat/ChatInterface.tsx',
      lastModified: new Date(),
      size: 3072,
    },
    {
      id: 'project-store',
      name: 'projectStore.ts',
      type: 'service',
      status: 'healthy',
      dependencies: ['api-client', 'websocket-client'],
      dependents: ['app-page'],
      impact: 0.85,
      path: '/src/lib/store/projectStore.ts',
      lastModified: new Date(),
      size: 2048,
    },
    {
      id: 'chat-store',
      name: 'chatStore.ts',
      type: 'service',
      status: 'healthy',
      dependencies: ['api-client', 'websocket-client', 'memory-service'],
      dependents: ['chat-interface'],
      impact: 0.9,
      path: '/src/lib/store/chatStore.ts',
      lastModified: new Date(),
      size: 2560,
    },
    {
      id: 'api-client',
      name: 'apiClient.ts',
      type: 'service',
      status: 'healthy',
      dependencies: ['axios', 'auth-service'],
      dependents: ['project-store', 'chat-store'],
      impact: 0.95,
      path: '/src/lib/api/client.ts',
      lastModified: new Date(),
      size: 4096,
    },
    {
      id: 'websocket-client',
      name: 'websocketClient.ts',
      type: 'service',
      status: 'healthy',
      dependencies: ['socket.io-client', 'auth-service'],
      dependents: ['project-store', 'chat-store'],
      impact: 0.9,
      path: '/src/lib/websocket/client.ts',
      lastModified: new Date(),
      size: 3072,
    },
    {
      id: 'database',
      name: 'PostgreSQL',
      type: 'database',
      status: 'healthy',
      dependencies: [],
      dependents: ['api-client'],
      impact: 1.0,
      size: 1024000,
    },
  ];

  // Transform dependency data to ReactFlow format
  const { flowNodes, flowEdges } = useMemo(() => {
    const nodes: Node[] = mockDependencyData.map((node, index) => {
      const getNodeIcon = (type: DependencyNode['type']) => {
        switch (type) {
          case 'file':
            return <FileText className="w-5 h-5" />;
          case 'component':
            return <Component className="w-5 h-5" />;
          case 'service':
            return <Zap className="w-5 h-5" />;
          case 'database':
            return <Database className="w-5 h-5" />;
          case 'api':
            return <Zap className="w-5 h-5" />;
          default:
            return <FileText className="w-5 h-5" />;
        }
      };

      const getNodeColor = (status: DependencyNode['status']) => {
        switch (status) {
          case 'healthy':
            return '#10b981'; // green
          case 'warning':
            return '#f59e0b'; // yellow
          case 'error':
            return '#ef4444'; // red
          default:
            return '#6b7280'; // gray
        }
      };

      const getPosition = (index: number, total: number) => {
        const cols = Math.ceil(Math.sqrt(total));
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        if (layoutDirection === 'TB') {
          return { x: col * 200, y: row * 150 };
        } else if (layoutDirection === 'LR') {
          return { x: col * 200, y: row * 150 };
        } else {
          return { x: (cols - col) * 200, y: row * 150 };
        }
      };

      return {
        id: node.id,
        position: getPosition(index, mockDependencyData.length),
        data: {
          label: (
            <div className="text-center">
              <div className="flex justify-center mb-1">
                {getNodeIcon(node.type)}
              </div>
              <div className="text-xs font-medium">{node.name}</div>
              <div className="text-xs text-gray-500">
                {node.type} • {node.impact > 0.8 ? 'High' : node.impact > 0.5 ? 'Medium' : 'Low'} impact
              </div>
            </div>
          ),
          node,
        },
        style: {
          background: '#ffffff',
          border: `2px solid ${getNodeColor(node.status)}`,
          borderRadius: '8px',
          padding: '8px',
          width: '120px',
          boxShadow: selectedNode === node.id ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    });

    const edges: Edge[] = [];
    mockDependencyData.forEach(node => {
      node.dependencies.forEach(depId => {
        const targetNode = mockDependencyData.find(n => n.id === depId);
        if (targetNode) {
          edges.push({
            id: `${node.id}-${depId}`,
            source: node.id,
            target: depId,
            type: 'smoothstep',
            animated: node.status === 'warning' || node.status === 'error',
            style: {
              stroke: node.status === 'error' ? '#ef4444' : node.status === 'warning' ? '#f59e0b' : '#6b7280',
              strokeWidth: node.impact > 0.8 ? 3 : 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: node.status === 'error' ? '#ef4444' : node.status === 'warning' ? '#f59e0b' : '#6b7280',
            },
          });
        }
      });
    });

    return { flowNodes: nodes, flowEdges: edges };
  }, [layoutDirection, selectedNode]);

  // Initialize nodes and edges
  React.useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClickHandler = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
    if (onNodeClick && node.data.node) {
      onNodeClick(node.data.node);
    }
  }, [onNodeClick]);

  const nodeTypes: NodeTypes = {};

  const selectedNodeData = selectedNode 
    ? mockDependencyData.find(node => node.id === selectedNode)
    : null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">File Dependencies</h2>
          <p className="text-sm text-gray-600">Visualize file and component dependencies</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Layout Direction */}
          <select
            value={layoutDirection}
            onChange={(e) => setLayoutDirection(e.target.value as 'TB' | 'LR' | 'RL')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TB">Top to Bottom</option>
            <option value="LR">Left to Right</option>
            <option value="RL">Right to Left</option>
          </select>
          
          {/* Legend */}
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Healthy</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Warning</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Error</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div className="flex gap-4">
        {/* React Flow Graph */}
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden" style={{ height }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClickHandler}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background color="#f3f4f6" gap={16} />
            {showControls && <Controls />}
            {showMiniMap && <MiniMap />}
          </ReactFlow>
        </div>

        {/* Node Details Panel */}
        {selectedNodeData && (
          <div className="w-80 bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">{selectedNodeData.name}</h3>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Type:</span>
                <span className="ml-2 text-sm font-medium capitalize">{selectedNodeData.type}</span>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <div className="ml-2 flex items-center space-x-1">
                  {selectedNodeData.status === 'healthy' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {selectedNodeData.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                  {selectedNodeData.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  <span className="text-sm font-medium capitalize">{selectedNodeData.status}</span>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Impact Score:</span>
                <div className="ml-2 flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        selectedNodeData.impact >= 0.8 ? 'bg-red-500' :
                        selectedNodeData.impact >= 0.5 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${selectedNodeData.impact * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round(selectedNodeData.impact * 100)}%
                  </span>
                </div>
              </div>
              
              {selectedNodeData.path && (
                <div>
                  <span className="text-sm text-gray-600">Path:</span>
                  <div className="ml-2 text-xs font-mono bg-gray-100 p-1 rounded">
                    {selectedNodeData.path}
                  </div>
                </div>
              )}
              
              {selectedNodeData.size && (
                <div>
                  <span className="text-sm text-gray-600">Size:</span>
                  <span className="ml-2 text-sm font-medium">
                    {selectedNodeData.size >= 1024 
                      ? `${(selectedNodeData.size / 1024).toFixed(1)} KB`
                      : `${selectedNodeData.size} B`
                    }
                  </span>
                </div>
              )}
              
              {selectedNodeData.dependencies.length > 0 && (
                <div>
                  <span className="text-sm text-gray-600">Dependencies:</span>
                  <div className="ml-2 space-y-1">
                    {selectedNodeData.dependencies.map(dep => (
                      <div key={dep} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {dep}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedNodeData.dependents.length > 0 && (
                <div>
                  <span className="text-sm text-gray-600">Dependents:</span>
                  <div className="ml-2 space-y-1">
                    {selectedNodeData.dependents.map(dep => (
                      <div key={dep} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {dep}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{mockDependencyData.length}</div>
          <div className="text-sm text-gray-600">Total Nodes</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {mockDependencyData.filter(n => n.status === 'healthy').length}
          </div>
          <div className="text-sm text-gray-600">Healthy</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">
            {mockDependencyData.filter(n => n.status === 'warning').length}
          </div>
          <div className="text-sm text-gray-600">Warnings</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-red-600">
            {mockDependencyData.filter(n => n.status === 'error').length}
          </div>
          <div className="text-sm text-gray-600">Errors</div>
        </div>
      </div>
    </div>
  );
};

export default FileDependencyVisualization;