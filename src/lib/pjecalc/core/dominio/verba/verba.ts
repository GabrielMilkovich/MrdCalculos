/**
 * PJe-Calc v2.15.1 — Verba (domínio base)
 *
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.verba.Verba (808 linhas)
 *
 * Status anterior no TS: **AUSENTE**. Esta classe era referenciada por
 * VerbaDeCalculo, OcorrenciaDeVerba, conversores `.pjc` e módulos de cálculo,
 * mas não havia implementação — o que contribui para o bug do conversor
 * descartando 34% das verbas do XML (auditoria, seção 7).
 *
 * Diferenças em relação ao Java (não afetam semântica de cálculo):
 *
 * - Persistência JPA removida. Em TS a identidade da verba é gerenciada pelo
 *   Supabase (tabela equivalente). Os métodos estáticos `remover()`, `obter()`,
 *   `obterTodos()`, `salvar()` do Java delegavam ao RepositorioDeVerba via
 *   EntidadeBase — em TS, isso fica a cargo da camada de service.
 *
 * - A configuração automática (`configurarVerbaInformada`, `configurarVerbaPrincipal`)
 *   originalmente era chamada dentro de `salvar()`. Expomos como método público
 *   `aplicarConfiguracaoImplicita()` para que o service/adapter a invoque antes
 *   de persistir; o comportamento sobre o objeto é idêntico.
 *
 * - `versao`, `obterChavePrimaria`, `legendaDaFormula`, `AssuntoCnj` são
 *   mantidos como campos simples; a responsabilidade de serialização fica com
 *   o adapter Supabase.
 *
 * - O método polimórfico `CaracteristicaDaVerbaEnum.definirOcorrenciaDePagamentoPara`
 *   foi extraído para `constantes/caracteristica-da-verba-operadores.ts`
 *   (TS não suporta corpo de método por constante de enum).
 */
import Decimal from 'decimal.js';
import {
  BaseDeCalculoDoPrincipalEnum,
  CaracteristicaDaVerbaEnum,
  ComportamentoDoReflexoEnumFull,
  DivisorDeVerbaEnum,
  JurosDoAjuizamentoEnum,
  LogicoEnum,
  OcorrenciaDePagamentoEnum,
  PeriodoDaMediaDoReflexoEnum,
  TipoDeGeracaoEnum,
  TipoDeQuantidadeEnum,
  TipoDeQuantidadeImportadaDoCalendarioEnum,
  TipoDeQuantidadeImportadaDoCartaoDePontoEnum,
  TipoVariacaoDaParcelaEnum,
  ValorDaVerbaEnum,
} from '../../constantes/enums';
import { TipoDeVerbaEnum } from '../../constantes/tipo-de-verba-enum';
import {
  operadorDaCaracteristica,
  type VerbaComOcorrencia,
} from '../../constantes/caracteristica-da-verba-operadores';
import { MensagemDeRecurso } from '../../comum/mensagem-de-recurso';
import { Mensagens } from '../../comum/mensagens';
import { NegocioException } from '../../comum/exceptions/negocio-exception';

Decimal.set({ precision: 20 });

/**
 * Identificador simples de CNJ de assunto (proxy para `AssuntoCnj` do Java).
 * A tabela de assuntos é gerenciada fora desta classe; aqui basta referenciar
 * o código e nome. Expandir conforme novos casos exigirem.
 */
export interface AssuntoCnjRef {
  id: number | null;
  nome?: string;
}

export class Verba implements VerbaComOcorrencia {
  // ───────── identidade (JPA → Supabase) ─────────
  private _id: number | null = null;
  private _versao = 0;

  // ───────── campos obrigatórios ─────────
  private _nome: string | null = null;
  private _descricao: string | null = null;
  private _assuntoCnj: AssuntoCnjRef | null = null;

  // ───────── classificação ─────────
  private _tipoVariacaoParcela: TipoVariacaoDaParcelaEnum = TipoVariacaoDaParcelaEnum.FIXA;
  private _valor: ValorDaVerbaEnum = ValorDaVerbaEnum.CALCULADO;
  private _caracteristica: CaracteristicaDaVerbaEnum = CaracteristicaDaVerbaEnum.COMUM;
  private _ocorrenciaDePagamento: OcorrenciaDePagamentoEnum = OcorrenciaDePagamentoEnum.MENSAL;
  private _jurosDoAjuizamento: JurosDoAjuizamentoEnum = JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS;
  private _tipo: TipoDeVerbaEnum = TipoDeVerbaEnum.PRINCIPAL;

  // ───────── incidências ─────────
  private _incidenciaINSS = false;
  private _incidenciaIRPF = false;
  private _incidenciaFGTS = false;
  private _incidenciaPrevidenciaPrivada = false;
  private _incidenciaPensaoAlimenticia = false;

  // ───────── reflexo ─────────
  private _geracaoReflexo: TipoDeGeracaoEnum = TipoDeGeracaoEnum.DIFERENCA;
  private _comporPrincipal: LogicoEnum = LogicoEnum.SIM;
  private _baseDeCalculoDoPrincipal: BaseDeCalculoDoPrincipalEnum | null =
    BaseDeCalculoDoPrincipalEnum.HISTORICO_SALARIAL;
  private _basesDeCalculoDoReflexo: Set<Verba> = new Set<Verba>();
  private _comportamentoDoReflexo: ComportamentoDoReflexoEnumFull =
    ComportamentoDoReflexoEnumFull.VALOR_MENSAL;
  private _periodoMediaReflexo: PeriodoDaMediaDoReflexoEnum =
    PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO;
  private _tratamentoDaFracaoDeMesDoReflexo = 'M';

  // ───────── cálculo (divisor, multiplicador, proporcionalidade) ─────────
  private _divisor: DivisorDeVerbaEnum = DivisorDeVerbaEnum.OUTRO_VALOR;
  private _outroDivisor: Decimal | null = null;
  private _multiplicador: Decimal | null = null;
  private _aplicarProporcionalidade: boolean | null = null;

  // ───────── quantidade ─────────
  private _tipoDaQuantidade: TipoDeQuantidadeEnum = TipoDeQuantidadeEnum.INFORMADA;
  private _tipoImportadadoDoCartaoDePonto: TipoDeQuantidadeImportadaDoCartaoDePontoEnum | null = null;
  private _tipoImportadaCalendario: TipoDeQuantidadeImportadaDoCalendarioEnum | null = null;
  private _aplicarProporcionalidadeAQuantidade: boolean | null = null;
  private _valorInformadoDaQuantidade: Decimal | null = null;

  // ───────── exclusões ─────────
  private _excluirFaltaJustificada = false;
  private _excluirFaltaNaoJustificada = false;
  private _excluirFeriasGozadas = false;

  // ───────────────────────────────────────────────────────────────
  //  Configurações implícitas (Java: configurar* chamados em salvar())
  // ───────────────────────────────────────────────────────────────
  private configurarVerbaInformada(): void {
    this._tipo = TipoDeVerbaEnum.PRINCIPAL;
    this._geracaoReflexo = TipoDeGeracaoEnum.DIFERENCA;
    this._baseDeCalculoDoPrincipal = BaseDeCalculoDoPrincipalEnum.ULTIMA_REMUNERACAO;
    this._basesDeCalculoDoReflexo.clear();
    this._divisor = DivisorDeVerbaEnum.OUTRO_VALOR;
    this._outroDivisor = null;
    this._multiplicador = null;
    this._aplicarProporcionalidade = false;
    this._comportamentoDoReflexo = ComportamentoDoReflexoEnumFull.VALOR_MENSAL;
    this._periodoMediaReflexo = PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO;
    this._tratamentoDaFracaoDeMesDoReflexo = 'M';
  }

  private configurarVerbaPrincipal(): void {
    this._basesDeCalculoDoReflexo.clear();
    this._comportamentoDoReflexo = ComportamentoDoReflexoEnumFull.VALOR_MENSAL;
    this._periodoMediaReflexo = PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO;
    this._tratamentoDaFracaoDeMesDoReflexo = 'M';
  }

  /**
   * Aplica a configuração implícita que o Java executava em `salvar()`.
   * Em TS, o adapter/service deve chamá-la antes de persistir.
   */
  aplicarConfiguracaoImplicita(): void {
    if (this.isValorInformado()) {
      this.configurarVerbaInformada();
    } else if (this.isValorCalculado() && this.isPrincipal()) {
      this.configurarVerbaPrincipal();
    }
  }

  // ───────────────────────────────────────────────────────────────
  //  Validação (Java: Verba.validar() — lança NegocioException)
  // ───────────────────────────────────────────────────────────────
  /**
   * Fidelidade 1-a-1 com Java.validar(). Lança `NegocioException` quando há
   * pelo menos uma `MensagemDeRecurso` acumulada (MSG0003 = obrigatório,
   * MSG0004 = inválido).
   */
  validar(): Verba {
    const excecao = new NegocioException();

    if (this.isValorCalculado() && this.isPrincipal()) {
      if (this._baseDeCalculoDoPrincipal == null) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'baseDeCalculoDoPrincipal', Mensagens.MSG0003, 'Base de Cálculo'),
        );
      }
      if (this._divisor == null) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'divisor', Mensagens.MSG0003, 'Divisor'),
        );
      }
      if (this._divisor === DivisorDeVerbaEnum.OUTRO_VALOR && this._outroDivisor == null) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'divisorOutro', Mensagens.MSG0003, 'Divisor'),
        );
      } else if (
        this._divisor === DivisorDeVerbaEnum.OUTRO_VALOR &&
        this._outroDivisor != null &&
        this._outroDivisor.lessThanOrEqualTo(0)
      ) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'divisorOutro', Mensagens.MSG0004, 'Divisor'),
        );
      }
      if (this._multiplicador == null) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'multiplicadorOutro', Mensagens.MSG0003, 'Multiplicador'),
        );
      } else if (this._multiplicador.lessThanOrEqualTo(0)) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'multiplicadorOutro', Mensagens.MSG0004, 'Multiplicador'),
        );
      }
      if (this._geracaoReflexo == null) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'geracaoReflexo', Mensagens.MSG0003, 'Geração do Reflexo'),
        );
      }
      if (TipoDeQuantidadeEnum.INFORMADA === this._tipoDaQuantidade) {
        if (this._valorInformadoDaQuantidade == null) {
          excecao.adicionarMensagemDeRecurso(
            new MensagemDeRecurso(this, 'valorInformadoDaQuantidade', Mensagens.MSG0003, 'Quantidade'),
          );
        }
        if (
          this._valorInformadoDaQuantidade != null &&
          this._valorInformadoDaQuantidade.lessThan(0)
        ) {
          excecao.adicionarMensagemDeRecurso(
            new MensagemDeRecurso(this, 'valorInformadoDaQuantidade', Mensagens.MSG0004, 'Quantidade'),
          );
        }
      }
    } else if (this.isValorCalculado() && this.isReflexo()) {
      if (this._basesDeCalculoDoReflexo == null || this._basesDeCalculoDoReflexo.size === 0) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'baseCalculoReflexo', Mensagens.MSG0003, 'Base de Cálculo'),
        );
      }
      if (this._divisor == null) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'divisor', Mensagens.MSG0003, 'Divisor'),
        );
      }
      if (this._divisor === DivisorDeVerbaEnum.OUTRO_VALOR && this._outroDivisor == null) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'outroDivisor', Mensagens.MSG0003, 'Divisor'),
        );
      } else if (
        this._divisor === DivisorDeVerbaEnum.OUTRO_VALOR &&
        this._outroDivisor != null &&
        this._outroDivisor.equals(0)
      ) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'outroDivisor', Mensagens.MSG0004, 'Divisor'),
        );
      }
      if (this._multiplicador == null) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'multiplicador', Mensagens.MSG0003, 'Multiplicador'),
        );
      } else if (this._multiplicador.equals(0)) {
        // Java: lança diretamente (não acumula)
        throw new NegocioException(
          null,
          new MensagemDeRecurso(this, 'multiplicador', Mensagens.MSG0004, 'Multiplicador'),
        );
      }
      if (this._comportamentoDoReflexo == null) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, null, Mensagens.MSG0003, 'Comportamento'),
        );
      }
      if (this._periodoMediaReflexo == null) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(
            this,
            'periodoMediaReflexo',
            Mensagens.MSG0003,
            'Período da Média do Reflexo',
          ),
        );
      }
      if (this._tratamentoDaFracaoDeMesDoReflexo == null) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(
            this,
            'tratamentoDaFracaoDeMesDoReflexo',
            Mensagens.MSG0003,
            'Tratamento da Fração de Mês do Reflexo',
          ),
        );
      }
      if (
        TipoDeQuantidadeEnum.INFORMADA === this._tipoDaQuantidade &&
        this._valorInformadoDaQuantidade == null
      ) {
        excecao.adicionarMensagemDeRecurso(
          new MensagemDeRecurso(this, 'valorInformadoDaQuantidade', Mensagens.MSG0003, 'Quantidade'),
        );
      }
    }

    if (excecao.existeMensagensDeRecurso()) {
      throw excecao;
    }
    return this;
  }

  // ───────────────────────────────────────────────────────────────
  //  Getters / setters
  // ───────────────────────────────────────────────────────────────
  getId(): number | null { return this._id; }
  setId(v: number | null): void { this._id = v; }
  obterChavePrimaria(): number | null { return this._id; }

  getVersao(): number { return this._versao; }
  setVersao(v: number): void { this._versao = v; }

  getNome(): string {
    return this._nome ?? '';
  }
  setNome(v: string | null): void { this._nome = v; }

  getDescricao(): string {
    return this._descricao ?? '';
  }
  setDescricao(v: string | null): void { this._descricao = v; }

  getAssuntoCnj(): AssuntoCnjRef | null { return this._assuntoCnj; }
  setAssuntoCnj(v: AssuntoCnjRef | null): void { this._assuntoCnj = v; }

  // ───── valor / tipo ─────
  isValorInformado(): boolean {
    return this._valor === ValorDaVerbaEnum.INFORMADO;
  }
  isValorCalculado(): boolean {
    return this._valor === ValorDaVerbaEnum.CALCULADO;
  }
  getValor(): ValorDaVerbaEnum { return this._valor; }
  setValor(v: ValorDaVerbaEnum): void { this._valor = v; }

  getTipoVariacaoParcela(): TipoVariacaoDaParcelaEnum { return this._tipoVariacaoParcela; }
  setTipoVariacaoParcela(v: TipoVariacaoDaParcelaEnum): void { this._tipoVariacaoParcela = v; }

  isPrincipal(): boolean {
    return this._tipo === TipoDeVerbaEnum.PRINCIPAL;
  }
  isReflexo(): boolean {
    return this._tipo === TipoDeVerbaEnum.REFLEXO;
  }
  getTipo(): TipoDeVerbaEnum { return this._tipo; }
  setTipo(v: TipoDeVerbaEnum): void { this._tipo = v; }

  // ───── incidências ─────
  getIncidenciaINSS(): boolean { return this._incidenciaINSS; }
  setIncidenciaINSS(v: boolean): void { this._incidenciaINSS = v; }
  getIncidenciaIRPF(): boolean { return this._incidenciaIRPF; }
  setIncidenciaIRPF(v: boolean): void { this._incidenciaIRPF = v; }
  getIncidenciaFGTS(): boolean { return this._incidenciaFGTS; }
  setIncidenciaFGTS(v: boolean): void { this._incidenciaFGTS = v; }
  getIncidenciaPrevidenciaPrivada(): boolean { return this._incidenciaPrevidenciaPrivada; }
  setIncidenciaPrevidenciaPrivada(v: boolean): void { this._incidenciaPrevidenciaPrivada = v; }
  getIncidenciaPensaoAlimenticia(): boolean { return this._incidenciaPensaoAlimenticia; }
  setIncidenciaPensaoAlimenticia(v: boolean): void { this._incidenciaPensaoAlimenticia = v; }

  // ───── ocorrência de pagamento ─────
  getOcorrenciaDePagamento(): OcorrenciaDePagamentoEnum { return this._ocorrenciaDePagamento; }
  setOcorrenciaDePagamento(v: OcorrenciaDePagamentoEnum): void { this._ocorrenciaDePagamento = v; }

  pagamentoMensal(): this {
    this._ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.MENSAL;
    return this;
  }
  isComPagamentoMensal(): boolean {
    return this._ocorrenciaDePagamento === OcorrenciaDePagamentoEnum.MENSAL;
  }

  pagamentoEmDezembro(): this {
    this._ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.DEZEMBRO;
    return this;
  }
  isComPagamentoEmDezembro(): boolean {
    return this._ocorrenciaDePagamento === OcorrenciaDePagamentoEnum.DEZEMBRO;
  }

  pagamentoNoDesligamento(): this {
    this._ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.DESLIGAMENTO;
    return this;
  }
  isComPagamentoNoDesligamento(): boolean {
    return this._ocorrenciaDePagamento === OcorrenciaDePagamentoEnum.DESLIGAMENTO;
  }

  pagamentoNoPeriodoAquisitivo(): this {
    this._ocorrenciaDePagamento = OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO;
    return this;
  }
  isComPagamentoNoPeriodoAquisitivo(): boolean {
    return this._ocorrenciaDePagamento === OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO;
  }

  // ───── característica (polimorfismo via operadores) ─────
  comCaracteristicaComum(): this {
    this.setCaracteristica(CaracteristicaDaVerbaEnum.COMUM);
    return this;
  }
  isVerbaComum(): boolean {
    return this._caracteristica === CaracteristicaDaVerbaEnum.COMUM;
  }

  comCaracteristicaDeDecimoTerceiro(): this {
    this.setCaracteristica(CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO);
    return this;
  }
  isVerbaDeDecimoTerceiro(): boolean {
    return this._caracteristica === CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO;
  }

  comCaracteristicaDeAvisoPrevio(): this {
    this.setCaracteristica(CaracteristicaDaVerbaEnum.AVISO_PREVIO);
    return this;
  }
  isVerbaDeAvisoPrevio(): boolean {
    return this._caracteristica === CaracteristicaDaVerbaEnum.AVISO_PREVIO;
  }

  comCaracteristicaDeFerias(): this {
    this.setCaracteristica(CaracteristicaDaVerbaEnum.FERIAS);
    return this;
  }
  isVerbaDeFerias(): boolean {
    return this._caracteristica === CaracteristicaDaVerbaEnum.FERIAS;
  }

  getCaracteristica(): CaracteristicaDaVerbaEnum { return this._caracteristica; }

  permiteAlterarOcorrenciaDePagamento(): boolean {
    if (this._caracteristica == null) return false;
    return operadorDaCaracteristica(this._caracteristica).permiteAlterarAOcorrenciaDePagamento();
  }

  setCaracteristica(c: CaracteristicaDaVerbaEnum): void {
    this._caracteristica = c;
    if (c != null) {
      operadorDaCaracteristica(c).definirOcorrenciaDePagamentoPara(this);
    }
  }

  // ───── juros / tipo / reflexo ─────
  getJurosDoAjuizamento(): JurosDoAjuizamentoEnum { return this._jurosDoAjuizamento; }
  setJurosDoAjuizamento(v: JurosDoAjuizamentoEnum): void { this._jurosDoAjuizamento = v; }

  getGeracaoReflexo(): TipoDeGeracaoEnum { return this._geracaoReflexo; }
  setGeracaoReflexo(v: TipoDeGeracaoEnum): void { this._geracaoReflexo = v; }

  getComporPrincipal(): LogicoEnum { return this._comporPrincipal; }
  setComporPrincipal(v: LogicoEnum): void { this._comporPrincipal = v; }

  getBaseDeCalculoDoPrincipal(): BaseDeCalculoDoPrincipalEnum | null {
    return this._baseDeCalculoDoPrincipal;
  }
  setBaseDeCalculoDoPrincipal(v: BaseDeCalculoDoPrincipalEnum | null): void {
    this._baseDeCalculoDoPrincipal = v;
  }

  getBasesDeCalculoDoReflexo(): Set<Verba> { return this._basesDeCalculoDoReflexo; }
  setBasesDeCalculoDoReflexo(s: Set<Verba>): void { this._basesDeCalculoDoReflexo = s; }

  // ───── divisor / multiplicador / proporcionalidade ─────
  isInformarDivisor(): boolean {
    return this._divisor === DivisorDeVerbaEnum.OUTRO_VALOR;
  }
  getDivisor(): DivisorDeVerbaEnum { return this._divisor; }
  setDivisor(v: DivisorDeVerbaEnum): void { this._divisor = v; }

  getOutroDivisor(): Decimal | null { return this._outroDivisor; }
  setOutroDivisor(v: Decimal | null): void { this._outroDivisor = v; }

  getMultiplicador(): Decimal | null { return this._multiplicador; }
  setMultiplicador(v: Decimal | null): void { this._multiplicador = v; }

  getAplicarProporcionalidade(): boolean | null { return this._aplicarProporcionalidade; }
  setAplicarProporcionalidade(v: boolean | null): void { this._aplicarProporcionalidade = v; }

  // ───── comportamento / período / fração ─────
  isComportamentoValorMensal(): boolean {
    return this._comportamentoDoReflexo === ComportamentoDoReflexoEnumFull.VALOR_MENSAL;
  }
  isComportamentoMediaPeloValor(): boolean {
    return (
      this._comportamentoDoReflexo === ComportamentoDoReflexoEnumFull.MEDIA_PELO_VALOR ||
      this._comportamentoDoReflexo === ComportamentoDoReflexoEnumFull.MEDIA_PELO_VALOR_CORRIGIDO
    );
  }
  isComportamentoMediaPelaQuantidade(): boolean {
    return this._comportamentoDoReflexo === ComportamentoDoReflexoEnumFull.MEDIA_PELA_QUANTIDADE;
  }
  getComportamentoDoReflexo(): ComportamentoDoReflexoEnumFull { return this._comportamentoDoReflexo; }
  setComportamentoDoReflexo(v: ComportamentoDoReflexoEnumFull): void {
    this._comportamentoDoReflexo = v;
  }

  getPeriodoMediaReflexo(): PeriodoDaMediaDoReflexoEnum { return this._periodoMediaReflexo; }
  setPeriodoMediaReflexo(v: PeriodoDaMediaDoReflexoEnum): void { this._periodoMediaReflexo = v; }

  getTratamentoDaFracaoDeMesDoReflexo(): string { return this._tratamentoDaFracaoDeMesDoReflexo; }
  setTratamentoDaFracaoDeMesDoReflexo(v: string): void {
    this._tratamentoDaFracaoDeMesDoReflexo = v;
  }

  // ───── quantidade ─────
  getTipoDaQuantidade(): TipoDeQuantidadeEnum { return this._tipoDaQuantidade; }
  setTipoDaQuantidade(v: TipoDeQuantidadeEnum): void { this._tipoDaQuantidade = v; }

  getTipoImportadadoDoCartaoDePonto(): TipoDeQuantidadeImportadaDoCartaoDePontoEnum | null {
    return this._tipoImportadadoDoCartaoDePonto;
  }
  setTipoImportadadoDoCartaoDePonto(v: TipoDeQuantidadeImportadaDoCartaoDePontoEnum | null): void {
    this._tipoImportadadoDoCartaoDePonto = v;
  }

  getTipoImportadaCalendario(): TipoDeQuantidadeImportadaDoCalendarioEnum | null {
    return this._tipoImportadaCalendario;
  }
  setTipoImportadaCalendario(v: TipoDeQuantidadeImportadaDoCalendarioEnum | null): void {
    this._tipoImportadaCalendario = v;
  }

  getAplicarProporcionalidadeAQuantidade(): boolean | null {
    return this._aplicarProporcionalidadeAQuantidade;
  }
  setAplicarProporcionalidadeAQuantidade(v: boolean | null): void {
    this._aplicarProporcionalidadeAQuantidade = v;
  }

  getValorInformadoDaQuantidade(): Decimal | null { return this._valorInformadoDaQuantidade; }
  setValorInformadoDaQuantidade(v: Decimal | null): void { this._valorInformadoDaQuantidade = v; }

  isTipoDaQuantidadeInformada(): boolean {
    return this._tipoDaQuantidade === TipoDeQuantidadeEnum.INFORMADA;
  }
  isTipoDaQuantidadeAvos(): boolean {
    return this._tipoDaQuantidade === TipoDeQuantidadeEnum.AVOS;
  }
  isTipoDaQuantidadeImportadaDoCalendario(): boolean {
    return this._tipoDaQuantidade === TipoDeQuantidadeEnum.IMPORTADA_DO_CALENDARIO;
  }
  isTipoDaQuantidadeImportadaDoCartaoDePonto(): boolean {
    // Java preserva essa resposta fixa — não existe valor IMPORTADA_DO_CARTAO_DE_PONTO
    // no enum TipoDeQuantidadeEnum. Ver DV-002 em docs/PORT-PJECALC-KNOWN-DIVERGENCES.md.
    return false;
  }

  // ───── exclusões ─────
  getExcluirFaltaJustificada(): boolean { return this._excluirFaltaJustificada; }
  setExcluirFaltaJustificada(v: boolean): void { this._excluirFaltaJustificada = v; }

  getExcluirFaltaNaoJustificada(): boolean { return this._excluirFaltaNaoJustificada; }
  setExcluirFaltaNaoJustificada(v: boolean): void { this._excluirFaltaNaoJustificada = v; }

  getExcluirFeriasGozadas(): boolean { return this._excluirFeriasGozadas; }
  setExcluirFeriasGozadas(v: boolean): void { this._excluirFeriasGozadas = v; }

  // ───── regras de proporcionalidade ─────
  isPermiteAplicarPropocionalidadeABase(): boolean {
    return (
      this.isVerbaComum() &&
      (this.isComPagamentoMensal() || this.isComPagamentoNoDesligamento())
    );
  }

  isPermiteAplicarPropocionalidadeAQuantidade(): boolean {
    return (
      this.isVerbaComum() &&
      (this.isComPagamentoMensal() || this.isComPagamentoNoDesligamento())
    );
  }

  /**
   * Monta `nome` a partir de `descricao` e, para reflexos, anexa a descrição
   * da verba principal associada (primeira encontrada em `verbas`). Se
   * `verbas` for null, usa as bases de cálculo da própria verba.
   *
   * Fidelidade 1-a-1 com Java.montarNomeCompleto().
   */
  montarNomeCompleto(verbas: Set<Verba> | null): void {
    const fonte = verbas ?? this.getBasesDeCalculoDoReflexo();
    if (this.isPrincipal()) {
      this.setNome(this.getDescricao().toUpperCase());
    } else if (this.isReflexo()) {
      let principalEncontrada: Verba | null = null;
      for (const v of fonte) {
        if (v.isPrincipal()) {
          principalEncontrada = v;
          break;
        }
      }
      const sufixo = principalEncontrada ? ' SOBRE ' + principalEncontrada.getDescricao() : ' ';
      this.setNome(this.getDescricao() + sufixo);
    }
  }

  toString(): string {
    return `Verba(nome=${this._nome ?? '<sem nome>'}, valor=${this._valor})`;
  }
}
