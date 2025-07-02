<script>
import { LabeledInput } from '@rancher/components';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { get, set } from '@shell/utils/object';

export default {
  name: 'VMNetworkConfig',
  components: {
    LabeledInput,
    LabeledSelect,
  },

  props: {
    value: {
      type: Object,
      required: true,
    },
    mode: {
      type: String,
      required: true,
    },
  },

  data() {
    return {
      interfaceTypes: [
        { label: 'masquerade', value: 'masquerade' },
        { label: 'bridge', value: 'bridge' },
        { label: 'sriov', value: 'sriov' },
      ],
      networkTypes: [
        { label: 'Pod Network', value: 'pod' },
        { label: 'Multus', value: 'multus' },
      ],
      localNetworkConfigs: [],
    };
  },

  computed: {
    isView() {
      return this.mode === 'view';
    },

    availableNetworkAttachments() {
      return [
        { label: 'Select network attachment...', value: '' },
        { label: 'Create new NAD (enter name below)', value: 'new' },
        // Add common NAD naming patterns
        { label: 'bridge-network', value: 'bridge-network' },
        { label: 'macvlan-network', value: 'macvlan-network' },
        { label: 'sriov-network', value: 'sriov-network' },
        { label: 'ovs-network', value: 'ovs-network' },
      ];
    },

    networks: {
      get() {
        return get(this.value, 'spec.template.spec.networks') || [];
      },
      set(newValue) {
        set(this.value, 'spec.template.spec.networks', newValue);
      },
    },

    interfaces: {
      get() {
        return get(this.value, 'spec.template.spec.domain.devices.interfaces') || [];
      },
      set(newValue) {
        set(this.value, 'spec.template.spec.domain.devices.interfaces', newValue);
      },
    },
  },

  methods: {
    getNetworkType(network) {
      if (network.pod) return 'pod';
      if (network.multus) return 'multus';
      return 'pod';
    },

    getInterfaceType(iface) {
      if (iface.masquerade) return 'masquerade';
      if (iface.bridge) return 'bridge';
      if (iface.sriov) return 'sriov';
      return 'masquerade';
    },

    loadNetworkConfigs() {
      const networks = this.networks;
      const interfaces = this.interfaces;

      this.localNetworkConfigs = networks.map((network) => {
        const iface = interfaces.find((i) => i.name === network.name) || {};
        const networkType = this.getNetworkType(network);
        return {
          name: network.name || '',
          networkType,
          networkName: network.multus?.networkName || '',
          interfaceType: this.getInterfaceType(iface),
          macAddress: iface.macAddress || '',
        };
      });
    },

    syncToModel() {
      const networks = [];
      const interfaces = [];

      this.localNetworkConfigs.forEach((config) => {
        if (config.name) {
          const network = { name: config.name };

          switch (config.networkType) {
            case 'pod':
              network.pod = {};
              break;
            case 'multus':
              if (config.networkName) {
                network.multus = { networkName: config.networkName };
              }
              break;
          }

          networks.push(network);

          const iface = { name: config.name };

          switch (config.interfaceType) {
            case 'masquerade':
              iface.masquerade = {};
              break;
            case 'bridge':
              iface.bridge = {};
              break;
            case 'sriov':
              iface.sriov = {};
              break;
          }

          if (config.macAddress) {
            iface.macAddress = config.macAddress;
          }

          interfaces.push(iface);
        }
      });

      this.networks = networks;
      this.interfaces = interfaces;
    },

    onNetworkTypeChange(index, value) {
      if (this.localNetworkConfigs[index]) {
        this.localNetworkConfigs[index].networkType = value;
        if (value === 'pod') {
          this.localNetworkConfigs[index].networkName = '';
        }

        this.syncToModel();
      }
    },

    updateNetworkField(index, field, value) {
      if (this.localNetworkConfigs[index]) {
        this.localNetworkConfigs[index][field] = value;
        if (field === 'networkType' && value === 'pod') {
          this.localNetworkConfigs[index].networkName = '';
        }

        this.syncToModel();
      }
    },

    updateNetworkSelection(index, value) {
      if (this.localNetworkConfigs[index] && value !== undefined) {
        if (value !== 'new' && value !== '') {
          this.localNetworkConfigs[index].networkName = value;
        }
        this.syncToModel();
      }
    },

    addNetwork() {
      const networkName = `net${this.localNetworkConfigs.length + 1}`;

      this.localNetworkConfigs.push({
        name: networkName,
        networkType: 'pod',
        networkName: '',
        interfaceType: 'masquerade',
        macAddress: '',
      });

      this.syncToModel();
    },

    removeNetwork(index) {
      if (index < this.localNetworkConfigs.length) {
        this.localNetworkConfigs.splice(index, 1);
        this.syncToModel();
      }
    },
  },

  created() {
    this.loadNetworkConfigs();
    if (this.localNetworkConfigs.length === 0 && this.mode !== 'create') {
      this.addNetwork();
    }
  },

  watch: {
    'value.spec.template.spec.networks': {
      handler() {
        this.loadNetworkConfigs();
      },
      deep: true,
    },
    'value.spec.template.spec.domain.devices.interfaces': {
      handler() {
        this.loadNetworkConfigs();
      },
      deep: true,
    },
  },
};
</script>

<template>
  <div>
    <div class="row mb-20">
      <div class="col span-12">
        <h3>Network Configuration</h3>
        <p class="text-muted">Configure network interfaces for the virtual machine (optional)</p>
      </div>
    </div>

    <div v-if="localNetworkConfigs.length === 0" class="row mb-20">
      <div class="col span-12">
        <div class="empty-state">
          <p class="text-muted">
            No network interfaces configured. Click "Add Network Interface" to configure networking.
          </p>
        </div>
      </div>
    </div>

    <div
      v-for="(network, index) in localNetworkConfigs"
      :key="`network-${index}`"
      class="network-config mb-20"
    >
      <div class="row mb-10">
        <div class="col span-12">
          <h4>Network {{ index + 1 }}</h4>
        </div>
      </div>

      <div class="row mb-10">
        <div class="col span-6">
          <LabeledInput
            v-model="localNetworkConfigs[index].name"
            :mode="mode"
            label="Interface Name"
            placeholder="default"
            @input="syncToModel"
          />
        </div>
        <div class="col span-6">
          <LabeledSelect
            v-model:value="localNetworkConfigs[index].networkType"
            :mode="mode"
            :options="networkTypes"
            label="Network Type"
            :reduce="(e) => e.value"
            @update:value="(value) => onNetworkTypeChange(index, value)"
          />
        </div>
      </div>

      <div v-if="network.networkType === 'multus'" class="row mb-10">
        <div class="col span-6">
          <LabeledSelect
            v-model:value="localNetworkConfigs[index].networkName"
            :mode="mode"
            :options="availableNetworkAttachments"
            label="Network Selection"
            placeholder="Select network option"
            :reduce="(e) => e.value"
            @update:value="(value) => updateNetworkSelection(index, value)"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model="localNetworkConfigs[index].networkName"
            :mode="mode"
            label="Network Attachment Name"
            placeholder="Enter or confirm NAD name"
            @input="syncToModel"
          />
          <div style="font-size: 12px; color: #666; margin-top: 5px">
            Enter the exact name of the NetworkAttachmentDefinition
          </div>
        </div>
      </div>

      <div class="row mb-10">
        <div class="col span-6">
          <LabeledSelect
            v-model:value="localNetworkConfigs[index].interfaceType"
            :mode="mode"
            :options="interfaceTypes"
            label="Interface Type"
            :reduce="(e) => e.value"
            @update:value="syncToModel"
          />
        </div>
        <div class="col span-6">
          <LabeledInput
            v-model="localNetworkConfigs[index].macAddress"
            :mode="mode"
            label="MAC Address"
            placeholder="02:00:00:00:00:00"
            @input="syncToModel"
          />
        </div>
      </div>

      <div class="row mb-10">
        <div class="col span-12">
          <button
            v-if="!isView && localNetworkConfigs.length > 1"
            type="button"
            class="btn btn-sm role-link"
            @click="removeNetwork(index)"
          >
            Remove Network Interface
          </button>
        </div>
      </div>

      <hr v-if="index < localNetworkConfigs.length - 1" class="section-divider" />
    </div>

    <div class="row">
      <div class="col span-12">
        <button v-if="!isView" type="button" class="btn btn-sm role-tertiary" @click="addNetwork">
          Add Network Interface
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
h3,
h4 {
  margin-bottom: 10px;
}

.text-muted {
  color: var(--muted);
  font-size: 0.9em;
  margin-bottom: 15px;
}

.network-config {
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 15px;
  background-color: var(--box-bg);
}

.section-divider {
  margin: 20px 0;
  border: none;
  border-top: 1px solid var(--border);
}

.empty-state {
  padding: 20px;
  text-align: center;
  background-color: var(--box-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
}
</style>
