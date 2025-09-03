<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else class="dashboard">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <h1>KubeVirt Dashboard</h1>
      <p class="text-muted">powered by WhiteStack</p>
    </div>

    <!-- VM Status Summary -->
    <div class="row">
      <div class="col span-12">
        <div class="row">
          <div class="col span-3">
            <div class="vm-status-cards">
              <h3>Virtual Machines</h3>
              <div class="status-grid">
                <div class="status-card running">
                  <div class="status-count">{{ vmStates.running }}</div>
                  <div class="status-label">Running</div>
                </div>
                <div class="status-card pending">
                  <div class="status-count">{{ vmStates.pending }}</div>
                  <div class="status-label">Pending</div>
                </div>
                <div class="status-card stopped">
                  <div class="status-count">{{ vmStates.stopped }}</div>
                  <div class="status-label">Stopped</div>
                </div>
                <div class="status-card failed">
                  <div class="status-count">{{ vmStates.failed }}</div>
                  <div class="status-label">Failed</div>
                </div>
              </div>
            </div>
          </div>

          <div class="col span-9">
            <div class="row">
              <div class="col span-4">
                <HardwareResourceGauge name="CPU" :used="cpuUsed" :units="cpuUsed.units" />
              </div>
              <div class="col span-4">
                <HardwareResourceGauge name="Memory" :used="memoryUsed" :units="memoryUsed.units" />
              </div>
              <div class="col span-4">
                <HardwareResourceGauge name="Storage" :used="storageUsed" units="GiB" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Host Nodes Table -->
    <div class="row mt-20">
      <div class="col span-12">
        <SimpleBox>
          <template #title>
            <h3>Host Nodes</h3>
          </template>
          <SortableTable
            :headers="nodeHeaders"
            :rows="nodeRows"
            :loading="loadingNodes"
            :search="false"
            :table-actions="false"
            :row-actions="false"
            key-field="id"
            :paging="false"
            :default-sort-by="nodeHeaders[0]?.name"
          />
        </SimpleBox>
      </div>
    </div>

    <!-- Events Table -->
    <div class="row mt-20">
      <div class="col span-12">
        <SimpleBox>
          <template #title>
            <h3>Recent Events</h3>
          </template>
          <SortableTable
            :headers="eventHeaders"
            :rows="eventRows"
            :loading="loadingEvents"
            :search="false"
            :table-actions="false"
            :row-actions="false"
            key-field="id"
            :paging="true"
            :default-sort-by="eventHeaders[0]?.name"
            :rows-per-page=10
          />
        </SimpleBox>
      </div>
    </div>
  </div>
</template>

<script>
import SimpleBox from '@shell/components/SimpleBox';
import SortableTable from '@shell/components/SortableTable';
import ResourceSummary from '@shell/components/ResourceSummary';
import HardwareResourceGauge from '@shell/components/HardwareResourceGauge';
import ConsumptionGauge from '@shell/components/ConsumptionGauge';

import Loading from '@shell/components/Loading';
import { VM_RESOURCE_NAME, VMI_RESOURCE_NAME } from '../constants';
import { mapGetters } from 'vuex';
import { createMemoryValues, parseSi } from '@shell/utils/units';

export default {
  name: 'KubeVirtDashboard',

  components: {
    SimpleBox,
    SortableTable,
    ResourceSummary,
    HardwareResourceGauge,
    ConsumptionGauge,
    Loading,
  },

  data() {
    return {
      VM_RESOURCE_NAME,
      capacity: {
        storage: { used: 0, total: 0 },
        cpu: { used: 0, total: 0 },
        memory: { used: 0, total: 0 },
      },
      nodeRows: [],
      eventRows: [],
      allVMs: [],
      allVMIs: [],
      loadingNodes: false,
      loadingEvents: false,
      refreshInterval: null,
    };
  },

  async fetch() {
    await Promise.all([this.loadCapacityMetrics(), this.loadHostNodes(), this.loadRecentEvents()]);
  },

  computed: {
    ...mapGetters(['currentCluster']),

    hasStats() {
      return this.currentCluster?.status?.allocatable && this.currentCluster?.status?.requested;
    },
    hasStorageStats() {
      return (
        this.currentCluster?.status?.allocatable?.['ephemeral-storage'] &&
        this.currentCluster?.status?.requested?.['ephemeral-storage']
      );
    },
    cpuUsed() {
      return {
        total: this.capacity.cpu.total,
        useful: this.capacity.cpu.used,
        units: this.t('clusterIndexPage.hardwareResourceGauge.units.cores', {
          count: this.capacity.cpu.total,
        }),
      };
    },

    memoryUsed() {
      return createMemoryValues(this.capacity.memory.total, this.capacity.memory.used);
    },

    storageUsed() {
      return {
        total: this.capacity.storage.total,
        useful: this.capacity.storage.used,
        units: 'GiB',
      };
    },

    vmStates() {
      const counts = { running: 0, pending: 0, stopped: 0, failed: 0 };
      
      this.allVMs.forEach(vm => {
        console.log('VM Debug:', {
          name: vm.metadata?.name,
          printableStatus: vm.status?.printableStatus,
          runStrategy: vm.spec?.runStrategy,
          ready: vm.status?.ready,
          type: vm.type
        });
        
        // Use printableStatus which already has the correct state
        const printableStatus = vm.status?.printableStatus?.toLowerCase();
        
        if (printableStatus === 'running') {
          counts.running++;
        } else if (printableStatus === 'starting' || printableStatus === 'pending') {
          counts.pending++;
        } else if (printableStatus === 'stopped' || printableStatus === 'stopping' || vm.spec?.runStrategy === 'Halted') {
          counts.stopped++;
        } else if (printableStatus === 'failed' || printableStatus === 'error' || printableStatus === 'crashloopbackoff') {
          counts.failed++;
        } else {
          // If printableStatus is not available, fallback to runStrategy
          const runStrategy = vm.spec?.runStrategy;
          if (runStrategy === 'Always') {
            counts.running++; // Assume running if Always
          } else if (runStrategy === 'Halted') {
            counts.stopped++;
          } else {
            counts.stopped++; // Default fallback
          }
        }
      });
      
      console.log('Final VM States:', counts);
      return counts;
    },
    nodeHeaders() {
      return [
        {
          name: 'name',
          labelKey: 'tableHeaders.name',
          value: 'name',
          sort: 'name',
        },
        {
          name: 'vms',
          labelKey: 'kubevirt.dashboard.virtualMachines',
          value: 'virtualMachines',
        },
      ];
    },

    eventHeaders() {
      return [
        {
          name: 'type',
          labelKey: 'tableHeaders.type',
          value: 'type',
          sort: 'type',
        },
        {
          name: 'object',
          labelKey: 'tableHeaders.object',
          value: 'object',
          sort: 'object',
        },
        {
          name: 'message',
          labelKey: 'tableHeaders.message',
          value: 'message',
          sort: 'message',
        },
        {
          name: 'age',
          labelKey: 'tableHeaders.age',
          value: 'age',
          sort: 'age',
          formatter: 'LiveDate',
        },
      ];
    },
  },

  mounted() {
    this.startAutoRefresh();
  },

  beforeUnmount() {
    this.stopAutoRefresh();
  },

  methods: {
    async loadCapacityMetrics() {
      try {
        const [vmis, vms, nodes] = await Promise.all([
          this.$store.dispatch('cluster/findAll', { type: VMI_RESOURCE_NAME }),
          this.$store.dispatch('cluster/findAll', { type: VM_RESOURCE_NAME }),
          this.$store.dispatch('cluster/findAll', { type: 'node' })
        ]);
        
        this.allVMs = vms;
        this.allVMIs = vmis;

        let vmiUsedCpu = 0;
        let vmiUsedMemory = 0;
        let vmiUsedStorage = 0;

        // Calcular uso real de VMIs (desde spec.domain, no requests)
        vmis.forEach((vmi) => {
          console.log('VMI Debug:', {
            name: vmi.metadata?.name,
            phase: vmi.status?.phase,
            domain: vmi.spec?.domain,
            resources: vmi.spec?.domain?.resources
          });

          // Obtener CPU y Memory desde spec.domain (configuración real de la VM)
          const domainCpu = vmi.spec?.domain?.cpu?.cores || 0;
          const domainMemory = vmi.spec?.domain?.memory?.guest || '0';
          
          if (domainCpu > 0) {
            vmiUsedCpu += domainCpu; // cores is already a number
          }

          if (domainMemory && domainMemory !== '0') {
            vmiUsedMemory += parseSi(domainMemory);
          }

          // Storage desde resources.requests si está disponible
          const resources = vmi.spec?.domain?.resources?.requests || {};
          if (resources['ephemeral-storage']) {
            vmiUsedStorage += parseSi(resources['ephemeral-storage']);
          }
        });

        console.log('VMI Resource Usage:', {
          cpu: vmiUsedCpu,
          memory: vmiUsedMemory / (1024 * 1024 * 1024), // GB
          storage: vmiUsedStorage / (1024 * 1024 * 1024) // GB
        });

        // Usar la fórmula para todos los recursos
        const totalCpuReal = parseSi(this.currentCluster?.status?.allocatable?.cpu || '0');
        const totalMemoryReal = parseSi(this.currentCluster?.status?.allocatable?.memory || '0');
        const totalStorageReal = parseSi(
          this.currentCluster?.status?.allocatable?.['ephemeral-storage'] || '0'
        );

        const consumoRealCpu = parseSi(this.currentCluster?.status?.requested?.cpu || '0');
        const consumoRealMemory = parseSi(this.currentCluster?.status?.requested?.memory || '0');
        const consumoRealStorage = parseSi(
          this.currentCluster?.status?.requested?.['ephemeral-storage'] || '0'
        );

        // Extraer storage desde los nodos individuales
        let totalNodeStorageAllocatable = 0;
        let totalNodeStorageUsed = 0;
        
        console.log('Nodes encontrados:', nodes.length);
        
        nodes.forEach((node, index) => {
          console.log(`Node ${index} (${node.metadata?.name}):`, {
            allocatable: node.status?.allocatable,
            ephemeralStorage: node.status?.allocatable?.['ephemeral-storage']
          });
          
          const nodeStorageAllocatable = parseSi(node.status?.allocatable?.['ephemeral-storage'] || '0');
          // Para storage usado, podemos usar una estimación o buscar en metrics
          // Por ahora usaremos una estimación conservadora del 30% del allocatable
          const nodeStorageUsed = nodeStorageAllocatable * 0.3;
          
          totalNodeStorageAllocatable += nodeStorageAllocatable;
          totalNodeStorageUsed += nodeStorageUsed;
        });
        
        console.log('Total storage from nodes:', {
          totalAllocatable: totalNodeStorageAllocatable,
          totalUsed: totalNodeStorageUsed,
          totalAllocatableGB: totalNodeStorageAllocatable / (1024 * 1024 * 1024),
          totalUsedGB: totalNodeStorageUsed / (1024 * 1024 * 1024)
        });

        // Usar storage de nodos si está disponible, sino fallback
        let storageUsedGB, storageTotalGB;
        
        if (totalNodeStorageAllocatable > 0) {
          // Usar storage de nodos
          storageUsedGB = totalNodeStorageUsed / (1024 * 1024 * 1024);
          storageTotalGB = totalNodeStorageAllocatable / (1024 * 1024 * 1024);
          
          console.log('Using node storage:', {
            usedGB: storageUsedGB,
            totalGB: storageTotalGB
          });
        } else {
          // Fallback si no hay datos de nodos
          storageUsedGB = vmiUsedStorage / (1024 * 1024 * 1024);
          storageTotalGB = storageUsedGB > 0 ? storageUsedGB * 4 : 25;
          
          console.log('Using VMI storage fallback:', {
            usedGB: storageUsedGB,
            totalGB: storageTotalGB
          });
        }

        // Aplicar la fórmula: RECURSOS_DISPONIBLE_REAL = RECURSO_TOTAL + RECURSO_VMI - RECURSO_DISPONIBLE
        const realCpuUsed = totalCpuReal - consumoRealCpu + vmiUsedCpu;
        const realMemoryUsed = totalMemoryReal - consumoRealMemory + vmiUsedMemory;

        console.log('Resource Calculation:', {
          totalCpuReal,
          consumoRealCpu, 
          vmiUsedCpu,
          calculatedCpuUsed: realCpuUsed,
          totalMemoryReal: totalMemoryReal / (1024 * 1024 * 1024),
          consumoRealMemory: consumoRealMemory / (1024 * 1024 * 1024),
          vmiUsedMemory: vmiUsedMemory / (1024 * 1024 * 1024),
          calculatedMemoryUsed: realMemoryUsed / (1024 * 1024 * 1024)
        });

        this.capacity = {
          storage: {
            used: storageUsedGB,
            total: storageTotalGB,
          },
          cpu: {
            used: vmiUsedCpu, // Show actual VMI CPU usage
            total: totalCpuReal > 0 ? totalCpuReal : vmiUsedCpu * 2, // Use cluster total or fallback
          },
          memory: {
            used: vmiUsedMemory / (1024 * 1024 * 1024), // Convert to GB
            total: totalMemoryReal > 0 ? totalMemoryReal / (1024 * 1024 * 1024) : (vmiUsedMemory / (1024 * 1024 * 1024)) * 2, // Use cluster total or fallback
          },
        };
      } catch (error) {
        console.error('Error loading capacity metrics:', error);
      }
    },
    async loadHostNodes() {
      try {
        this.loadingNodes = true;
        const nodes = await this.$store.dispatch('cluster/findAll', { type: 'node' });
        const vmis = await this.$store.dispatch('cluster/findAll', { type: VMI_RESOURCE_NAME });

        const nodeVmMap = new Map();

        nodes.forEach((node) => {
          nodeVmMap.set(node.metadata?.name, []);
        });

        vmis.forEach((vmi) => {
          const nodeName = vmi.status?.nodeName;
          const vmName = vmi.metadata?.name;

          if (nodeName && vmName && nodeVmMap.has(nodeName)) {
            nodeVmMap.get(nodeName).push(vmName);
          }
        });

        this.nodeRows = Array.from(nodeVmMap.entries()).map(([name, vms], index) => ({
          id: `node-${index}`,
          name,
          virtualMachines: vms.join(', ') || 'No VMs running',
        }));
      } catch (error) {
        console.error('Error loading host nodes:', error);
      } finally {
        this.loadingNodes = false;
      }
    },

    async loadRecentEvents() {
      try {
        this.loadingEvents = true;
        const events = await this.$store.dispatch('cluster/findAll', { type: 'event' });

        const now = new Date();
        const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);

        console.log('All events found:', events.length);
        console.log('Sample events:', events.slice(0, 3));

        this.eventRows = events
          .filter((event) => {
            const eventTime = new Date(event.lastTimestamp || event.eventTime);
            const isRecent = eventTime > fiveHoursAgo;
            
            // Show all event types (don't filter by Warning/Normal only)
            const isRelevant = true; // Accept all event types
            
            // Include VM-related events AND virt-launcher pods
            const isVMRelated = event.involvedObject?.apiVersion?.includes('kubevirt.io') || 
                               event.involvedObject?.kind === 'VirtualMachine' ||
                               event.involvedObject?.kind === 'VirtualMachineInstance' ||
                               event.involvedObject?.name?.includes('virt-launcher-') ||
                               event.involvedObject?.kind === 'Pod' && event.involvedObject?.name?.includes('virt-launcher');

            console.log('Event filter:', {
              name: event.involvedObject?.name,
              eventType: event._type, // This should show Warning, Normal, etc.
              reason: event.reason,
              kind: event.involvedObject?.kind,
              apiVersion: event.involvedObject?.apiVersion,
              message: event.message?.substring(0, 50) + '...',
              rawEventFields: Object.keys(event).slice(0, 10), // Show available fields
              isRecent,
              isRelevant,
              isVMRelated,
              timestamp: event.lastTimestamp || event.eventTime
            });

            return isRecent && isRelevant && isVMRelated;
          })
          .slice(0, 20) // Show more events
          .map((event, index) => ({
            id: `event-${index}`,
            type: event._type,
            object: `${event.involvedObject?.kind || 'Unknown'}/${event.involvedObject?.name || 'Unknown'}`,
            message: event.message || event.reason || 'No message',
            age: event.lastTimestamp || event.eventTime || event.firstTimestamp,
          }));
      } catch (error) {
        console.error('Error loading recent events:', error);
      } finally {
        this.loadingEvents = false;
      }
    },

    startAutoRefresh() {
      this.refreshInterval = setInterval(() => {
        this.loadCapacityMetrics();
        this.loadHostNodes();
        this.loadRecentEvents();
      }, 30000);
    },

    stopAutoRefresh() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.dashboard {
  .dashboard-header {
    margin-bottom: 30px;
    text-align: left;

    h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 600;
      color: var(--body-text);
    }

    .text-muted {
      margin: 5px 0 0 0;
      font-size: 0.9rem;
      color: var(--muted);
    }
  }

  .summary-content {
    padding: 10px 0;
  }

  h3 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--body-text);
  }

  .vm-status-cards {
    background: var(--box-bg, #f8f9fa);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;

    h3 {
      margin-bottom: 15px;
      text-align: center;
    }

    .status-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .status-card {
      text-align: center;
      padding: 12px 8px;
      border-radius: 6px;
      border: 1px solid transparent;

      .status-count {
        font-size: 1.8rem;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .status-label {
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        opacity: 0.8;
      }

      &.running {
        background: var(--success-banner-bg, #d4edda);
        border-color: var(--success, #28a745);
        color: var(--success, #28a745);
      }

      &.pending {
        background: var(--info-banner-bg, #d1ecf1);
        border-color: var(--info, #17a2b8);
        color: var(--info, #17a2b8);
      }

      &.stopped {
        background: var(--warning-banner-bg, #fff3cd);
        border-color: var(--warning, #ffc107);
        color: var(--warning, #856404);
      }

      &.failed {
        background: var(--error-banner-bg, #f8d7da);
        border-color: var(--error, #dc3545);
        color: var(--error, #dc3545);
      }
    }
  }
}
</style>
