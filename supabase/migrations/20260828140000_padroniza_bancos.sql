-- Padroniza o nome do banco/instituição em disponibilidades (a planilha original trazia
-- descrições de produto, ex.: "APLICACAO FINANCEIRA - COOPERCRED LTDA"). A partir daqui
-- o campo banco passa a conter só a instituição, permitindo agrupar corretamente a
-- concentração por banco; o texto de produto que carregava informação extra vai para
-- a coluna produto.

update public.disponibilidades set banco = 'Coopercred' where banco = 'APLICACAO - COOPERCRED';
update public.disponibilidades set banco = 'Sicoob Unicentro' where banco = 'APLICACAO - SICOOB UNICENTRO';
update public.disponibilidades set banco = 'Sicredi' where banco = 'APLICACAO - SICREDI';
update public.disponibilidades set banco = 'Banco do Brasil' where banco = 'APLICACAO BANCO DO BRASIL';
update public.disponibilidades set banco = 'Coopercred' where banco = 'APLICACAO COOPERCRED';
update public.disponibilidades set banco = 'Emprecred' where banco = 'APLICACAO EMPRECRED';
update public.disponibilidades set banco = 'Coopercred' where banco = 'APLICACAO FINANCEIRA - COOPERCRED';
update public.disponibilidades set banco = 'Coopercred' where banco = 'APLICACAO FINANCEIRA - COOPERCRED LTDA';
update public.disponibilidades set banco = 'Bradesco' where banco = 'APLICACAO FINANCEIRA BRADESCO 131105';
update public.disponibilidades set banco = 'Bradesco' where banco = 'APLICACAO FINANCEIRA BRADESCO 1787-6';
update public.disponibilidades set banco = 'Itaú BBA' where banco = 'APLICACAO ITAU BBA';
update public.disponibilidades set banco = 'Santander' where banco = 'APLICACAO SANTANDER';
update public.disponibilidades set banco = 'Banco Votorantim' where banco = 'APLICACAO VOTORANTIM';
update public.disponibilidades set banco = 'Banco do Brasil' where banco = 'B. BRASIL S.A.';
update public.disponibilidades set banco = 'Banco ABC Brasil' where banco = 'BANCO ABC BRASIL S.A.';
update public.disponibilidades set banco = 'Bradesco' where banco = 'BANCO BRADESCO S.A.';
update public.disponibilidades set banco = 'Banco da Amazônia' where banco = 'BANCO DA AMAZONIA S.A.';
update public.disponibilidades set banco = 'Banco Inter' where banco = 'BANCO INTER';
update public.disponibilidades set banco = 'Itaú' where banco = 'BANCO ITAU';
update public.disponibilidades set banco = 'Itaú' where banco = 'BANCO ITAU C/C 04918-4';
update public.disponibilidades set banco = 'Itaú' where banco = 'BANCO ITAU S.A.';
update public.disponibilidades set banco = 'Safra' where banco = 'BANCO SAFRA S.A.';
update public.disponibilidades set banco = 'Bradesco' where banco = 'BRADESCO S.A.';
update public.disponibilidades set banco = 'Caixa (espécie)' where banco = 'CAIXA';
update public.disponibilidades set banco = 'Caixa Econômica Federal' where banco = 'CAIXA ECONOMICA C/C 577572729-7';
update public.disponibilidades set banco = 'Caixa Econômica Federal' where banco = 'CAIXA ECONOMICA FEDERAL';
update public.disponibilidades set banco = 'Citibank' where banco = 'CITIBANK BRAZIL';
update public.disponibilidades set banco = 'Coopercred' where banco = 'COOPERCRED';
update public.disponibilidades set banco = 'Coopercred' where banco = 'COOPERCRED LTDA';
update public.disponibilidades set banco = 'Credigoiás' where banco = 'CREDIGOIAS LTDA';
update public.disponibilidades set banco = 'Emprecred' where banco = 'EMPRECRED';
update public.disponibilidades set banco = 'BTG Pactual', produto = 'Fundo EXA' where banco = 'FUNDO EXA - BANCO BTG PACTUAL';
update public.disponibilidades set banco = 'Coopercred' where banco = 'POUPANCA - COOPERCRED';
update public.disponibilidades set banco = 'Coopercred' where banco = 'QUOTAS COOPERCRED';
update public.disponibilidades set banco = 'Credigoiás' where banco = 'QUOTAS CREDIGOIAS LTDA';
update public.disponibilidades set banco = 'Emprecred' where banco = 'QUOTAS EMPRECRED';
update public.disponibilidades set banco = 'Sicredi' where banco = 'QUOTAS SICREDI';
update public.disponibilidades set banco = 'Sicoob Unicentro' where banco = 'QUOTAS UNICENTRO';
update public.disponibilidades set banco = 'XP Investimentos' where banco = 'SC XP INVESTIMENTOS';
update public.disponibilidades set banco = 'Sicoob Unicentro' where banco = 'SICOOB UNICENTRO NORTE BRASILEIRO';
update public.disponibilidades set banco = 'Sicredi' where banco = 'SICREDI';
update public.disponibilidades set banco = 'StoneX' where banco = 'STONEX BRASIL';
update public.disponibilidades set banco = 'Banco Votorantim' where banco = 'VOTORANTIM';
update public.disponibilidades set banco = 'Banco Votorantim', produto = 'Conta vinculada' where banco = 'VOTORANTIM - CONTA VINCULADA';
